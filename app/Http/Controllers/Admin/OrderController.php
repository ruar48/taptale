<?php

namespace App\Http\Controllers\Admin;

use App\Concerns\ConvertsPesos;
use App\Enums\ActivityType;
use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
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
            'template',
            'paymentMethod',
            'files',
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
        ]);
    }

    /**
     * A printable packing slip. Gift orders leave every price off.
     */
    public function packingSlip(Order $order): Response
    {
        return Inertia::render('admin/orders/packing-slip', [
            'order' => new OrderResource($order),
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
