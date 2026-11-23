<?php

namespace App\Http\Controllers\Storefront;

use App\Actions\Orders\PlaceOrder;
use App\Actions\Payments\StartPayMongoCheckout;
use App\Actions\Payments\StartPayMongoQrPh;
use App\Enums\ExperienceTemplate;
use App\Http\Controllers\Controller;
use App\Http\Requests\Storefront\StoreOrderRequest;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\PaymentMethodResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\TemplateResource;
use App\Models\Category;
use App\Models\DigitalExperience;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Template;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class OrderWizardController extends Controller
{
    /**
     * Show the step-by-step personalization and checkout wizard. Occasions
     * are optional gift ideas that only narrow the list of gifts.
     */
    public function create(Request $request): Response
    {
        $categorySlug = $this->queryText($request, 'category');
        $productSlug = $this->queryText($request, 'product');

        $category = $categorySlug !== null ? Category::active()->where('slug', $categorySlug)->first() : null;
        $product = $productSlug !== null ? Product::active()->where('slug', $productSlug)->first() : null;

        if ($category !== null && $product !== null && ! $product->categories()->whereKey($category->id)->exists()) {
            $category = null;
        }

        $product?->load(['images', 'options' => fn ($query) => $query->where('is_active', true)]);

        $products = $category !== null ? $category->products()->active() : Product::active();

        $user = $request->user();

        if ($user === null && $product !== null) {
            /*
             * Once a guest is crafting a gift, logging in or signing up from
             * anywhere (the checkout panel, the header, two-factor) brings
             * them back here, where the browser draft restores their gift.
             * Guests who only looked around keep the normal dashboard redirect.
             */
            redirect()->setIntendedUrl($request->fullUrl());
        }

        return Inertia::render('storefront/create', [
            'categories' => CategoryResource::collection(Category::active()->get()),
            'selectedCategory' => $category ? new CategoryResource($category) : null,
            'products' => ProductResource::collection($products->with('images')->get()),
            'selectedProduct' => $product ? new ProductResource($product) : null,
            'templates' => $product
                ? TemplateResource::collection(Template::active()->availableFor($category, $product)->get())
                : [],
            'experienceTemplates' => ExperienceTemplate::options(),
            'initialTemplate' => $this->queryText($request, 'template'),
            'initialPage' => ExperienceTemplate::tryFrom((string) $this->queryText($request, 'page'))?->value,
            'maxPagePhotos' => DigitalExperience::MAX_PHOTOS,
            'paymentMethods' => PaymentMethodResource::collection(PaymentMethod::active()->get()),
            'pricing' => [
                'delivery_fee' => (int) config('taptale.delivery_fee'),
                'flowers_addon_price' => (int) config('taptale.flowers_addon_price'),
                'free_delivery_threshold' => (int) config('taptale.free_delivery_threshold'),
                'max_upload_kilobytes' => (int) config('taptale.max_upload_kilobytes'),
            ],
            'customer' => $user === null ? null : [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'address_line' => $user->address_line,
                'city' => $user->city,
                'province' => $user->province,
                'postal_code' => $user->postal_code,
            ],
            'passwordRules' => $user === null ? Password::defaults()->toPasswordRulesString() : null,
            'seo' => [
                'title' => 'Order Your Gift',
                'description' => 'Create a personalized NFC keychain or photo keepsake in a few steps — pick a gift, choose a design and add your photos and message.',
            ],
        ]);
    }

    /**
     * Place the personalized order.
     */
    public function store(
        StoreOrderRequest $request,
        PlaceOrder $placeOrder,
        StartPayMongoCheckout $startCheckout,
        StartPayMongoQrPh $startQrPh,
    ): SymfonyResponse {
        $order = $placeOrder->handle(
            $request->user(),
            $request->validated(),
            array_values($request->file('photos', [])),
            array_values($request->file('page_photos', [])),
        );

        $method = $order->paymentMethod;

        if ($method !== null && $method->isPayMongo() && $order->total > 0) {
            try {
                if ($method->usesTaptaleQr()) {
                    $startQrPh->handle($order, $method);

                    return to_route('account.orders.qrph.show', $order);
                }

                return Inertia::location($startCheckout->handle($order, $method));
            } catch (ValidationException $exception) {
                Inertia::flash('toast', ['type' => 'warning', 'message' => __('Your order :reference is saved, but online payment could not start. Tap "Pay securely" below to try again.', ['reference' => $order->reference])]);

                return to_route('account.orders.show', $order);
            }
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Thank you! Your order :reference has been placed.', ['reference' => $order->reference])]);

        return to_route('account.orders.show', $order);
    }

    /**
     * A plain text query value, or null. Links get shared and mangled, and
     * "?category[]=x" must open the wizard rather than crash it.
     */
    private function queryText(Request $request, string $key): ?string
    {
        $value = $request->query($key);

        return is_string($value) && $value !== '' ? $value : null;
    }
}
