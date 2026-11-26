<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Orders\CreateManualOrder;
use App\Concerns\ConvertsPesos;
use App\Enums\ActivityType;
use App\Enums\ExperienceTemplate;
use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreManualOrderRequest;
use App\Http\Resources\OrderResource;
use App\Http\Resources\PaymentMethodResource;
use App\Http\Resources\ProductResource;
use App\Models\DigitalExperience;
use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    use ConvertsPesos;

    /**
     * List orders with status filters and search.
     */
    public function index(Request $request): Response
    {
        $status = OrderStatus::tryFrom($request->string('status')->toString());
        $search = $request->string('search')->trim()->toString();

        $orders = Order::query()
            ->with('product:id,slug,art_style')
            ->filtered($status, $search)
            ->latest()
            ->latest('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('admin/orders/index', [
            'orders' => OrderResource::collection($orders),
            'filters' => ['status' => $status?->value, 'search' => $search],
            'statusCounts' => Order::query()->toBase()->selectRaw('status, count(*) as aggregate')->groupBy('status')->pluck('aggregate', 'status'),
            'statuses' => OrderStatus::options(),
        ]);
    }

    /**
     * Show an order with every detail the studio needs.
     */
    public function show(Order $order): Response
    {
        $order->load([
            'user:id,name,email',
            'product:id,slug,art_style',
            'category:id,name',
            'paymentMethod',
            'files',
            'items',
            'proofs',
            'latestProof',
            'payments.method',
            'experience',
            'review',
            'activities.user:id,name',
        ]);

        return Inertia::render('admin/orders/show', [
            'order' => new OrderResource($order),
            'statuses' => OrderStatus::options(),
            'websiteEditUrl' => $order->websiteEditUrl(),
            'templates' => ExperienceTemplate::options(),
        ]);
    }

    /**
     * The form for an order taken outside the online shop: a walk-in, or a
     * customer who ordered over Messenger.
     */
    public function create(Request $request): Response
    {
        $template = $request->query('template');

        return Inertia::render('admin/orders/create', [
            'channels' => OrderChannel::manualOptions(),
            'products' => ProductResource::collection(
                Product::query()
                    ->with(['options' => fn ($query) => $query->where('is_active', true)])
                    ->orderByDesc('is_active')
                    ->orderBy('sort_order')
                    ->orderBy('name')
                    ->get(),
            ),
            'paymentMethods' => PaymentMethodResource::collection(PaymentMethod::active()->get()),
            'defaultDeliveryFee' => (int) config('taptale.delivery_fee'),
            'templates' => ExperienceTemplate::options(),
            'initialTemplate' => is_string($template) ? ExperienceTemplate::tryFrom($template)?->value : null,
        ]);
    }

    /**
     * Save a walk-in or chat order. It comes with a website edit link the
     * studio sends the customer so they can add their photos and words.
     */
    public function store(StoreManualOrderRequest $request, CreateManualOrder $createManualOrder): RedirectResponse
    {
        $order = $createManualOrder->handle($request->user(), $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Order :reference created. Send the customer the website edit link.', ['reference' => $order->reference])]);

        return to_route('admin.orders.show', $order);
    }

    /**
     * Create a new approval link for the customer. A link sent before stops
     * working.
     */
    public function issueApprovalLink(Order $order): RedirectResponse
    {
        $order->issueApprovalToken();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('New website edit link ready to share.')]);

        return back();
    }

    /**
     * Turn the approval link off.
     */
    public function revokeApprovalLink(Order $order): RedirectResponse
    {
        $order->revokeApprovalToken();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Website edit link turned off.')]);

        return back();
    }

    /**
     * Give an order that has no website one, in the template the studio
     * picks. Every keychain opens a website.
     */
    public function createWebsite(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate(
            ['experience_template' => ['required', Rule::enum(ExperienceTemplate::class)]],
            ['experience_template.required' => 'Please choose a website template.'],
        );

        if ($order->experience()->exists()) {
            return back();
        }

        $template = ExperienceTemplate::from($validated['experience_template']);

        $experience = new DigitalExperience([
            'template' => $template,
            'theme' => $template->defaultTheme(),
            'title' => $order->personalization['names'] ?? $order->product_name,
            'message' => $order->personalization['message'] ?? null,
            'event_date' => $order->personalization['date'] ?? null,
            'photos' => [],
        ]);
        $experience->user_id = $order->user_id;
        $order->experience()->save($experience);

        if ($order->approval_token === null) {
            $order->issueApprovalToken();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Website created. Send the customer the edit link, then program the tag.')]);

        return back();
    }

    /**
     * A printable packing slip. Gift orders leave every price off.
     */
    public function packingSlip(Order $order): Response
    {
        return Inertia::render('admin/orders/packing-slip', [
            'order' => new OrderResource($order->load('items')),
        ]);
    }

    /**
     * Change the order status. Production statuses require design approval.
     */
    public function updateStatus(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::enum(OrderStatus::class)],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $order->moveTo(OrderStatus::from($validated['status']), $request->user(), $validated['note'] ?? null);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Order status updated.')]);

        return back();
    }

    /**
     * Record courier and tracking details.
     */
    public function updateShipping(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'courier' => ['nullable', 'string', 'max:120'],
            'tracking_number' => ['nullable', 'string', 'max:120'],
            'tracking_url' => ['nullable', 'url:http,https', 'max:500'],
        ]);

        $order->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Shipping details saved.')]);

        return back();
    }

    /**
     * Apply a discount or surcharge to the order total.
     */
    public function adjust(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'adjustment' => ['required', 'numeric', 'min:-1000000', 'max:1000000'],
            'adjustment_note' => ['required', 'string', 'max:255'],
        ]);

        $order->adjustment = $this->toCentavos($validated['adjustment']);
        $order->adjustment_note = $validated['adjustment_note'];
        $order->recalculateTotal();
        $order->save();

        $order->recordActivity(
            ActivityType::Adjusted,
            'Order total adjusted: '.$validated['adjustment_note'],
            $request->user(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Order total adjusted.')]);

        return back();
    }

    /**
     * Add a note to the order timeline (internal by default).
     */
    public function storeNote(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
            'is_internal' => ['boolean'],
        ]);

        $order->recordActivity(
            ActivityType::Note,
            $validated['body'],
            $request->user(),
            internal: $request->boolean('is_internal', true),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Note added.')]);

        return back();
    }
}
