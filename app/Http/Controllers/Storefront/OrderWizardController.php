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
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Template;
use Illuminate\Http\Request;
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
        $category = $request->filled('category')
            ? Category::active()->where('slug', $request->string('category'))->first()
            : null;

        $product = $request->filled('product')
            ? Product::active()->where('slug', $request->string('product'))->first()
            : null;

        if ($category !== null && $product !== null && ! $product->categories()->whereKey($category->id)->exists()) {
            $category = null;
        }

        $product?->load(['images', 'options' => fn ($query) => $query->where('is_active', true)]);

        $products = $category !== null ? $category->products()->active() : Product::active();

        $user = $request->user();

        return Inertia::render('storefront/create', [
            'categories' => CategoryResource::collection(Category::active()->get()),
            'selectedCategory' => $category ? new CategoryResource($category) : null,
            'products' => ProductResource::collection($products->with('images')->get()),
            'selectedProduct' => $product ? new ProductResource($product) : null,
            'templates' => $product
                ? TemplateResource::collection(Template::active()->availableFor($category, $product)->get())
                : [],
            'experienceTemplates' => ExperienceTemplate::options(),
            'initialTemplate' => $request->string('template')->toString() ?: null,
            'paymentMethods' => PaymentMethodResource::collection(PaymentMethod::active()->get()),
            'pricing' => [
                'delivery_fee' => (int) config('taptale.delivery_fee'),
                'free_delivery_threshold' => (int) config('taptale.free_delivery_threshold'),
                'max_upload_kilobytes' => (int) config('taptale.max_upload_kilobytes'),
            ],
            'customer' => [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'address_line' => $user->address_line,
                'city' => $user->city,
                'province' => $user->province,
                'postal_code' => $user->postal_code,
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
        );

        $method = $order->paymentMethod;

        if ($method !== null && $method->isPayMongo()) {
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
}
