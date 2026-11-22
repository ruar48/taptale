<?php

namespace App\Http\Controllers\Account;

use App\Actions\Payments\ClosePayMongoCheckout;
use App\Enums\ActivityType;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Http\Resources\PaymentMethodResource;
use App\Models\Order;
use App\Models\PaymentMethod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    /**
     * List the customer's orders.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('account/orders/index', [
            'orders' => OrderResource::collection(
                $request->user()->orders()->with('product:id,slug,art_style')->latest()->latest('id')->paginate(10)
            ),
        ]);
    }

    /**
     * Show an order with its design proofs, files, payments and timeline.
     */
    public function show(Request $request, Order $order): Response
    {
        Gate::authorize('update', $order);

        $order->load([
            'product:id,slug,art_style,max_photos',
            'category:id,name',
            'template',
            'paymentMethod',
            'files',
            'proofs',
            'latestProof',
            'payments.method',
            'experience',
            'review',
            'activities' => fn ($query) => $query->where('is_internal', false),
        ]);

        return Inertia::render('account/orders/show', [
            'order' => new OrderResource($order),
            'paymentMethods' => PaymentMethodResource::collection(PaymentMethod::active()->get()),
            'maxUploadKilobytes' => (int) config('taptale.max_upload_kilobytes'),
        ]);
    }

    /**
     * Cancel an order that has not been paid yet.
     */
    public function cancel(Request $request, Order $order, ClosePayMongoCheckout $closeCheckout): RedirectResponse
    {
        Gate::authorize('update', $order);

        if (! $order->status->isCancellableByCustomer()) {
            throw ValidationException::withMessages([
                'order' => 'This order can no longer be cancelled online. Please contact us for help.',
            ]);
        }

        // Once money is in, cancelling means a refund the studio has to
        // arrange, so it is never done from a button.
        if ($order->load('payments')->amountPaid() > 0) {
            throw ValidationException::withMessages([
                'order' => 'You have already paid part of this order, so it can\'t be cancelled online. Please contact us and we will arrange your refund.',
            ]);
        }

        $openCheckouts = $order->payments()
            ->where('status', PaymentStatus::Pending)
            ->whereNotNull('gateway_checkout_id')
            ->get();

        foreach ($openCheckouts as $payment) {
            if (! $closeCheckout->handle($payment)) {
                throw ValidationException::withMessages([
                    'order' => 'Your online payment for this order just went through, so it can no longer be cancelled online. Please contact us for help.',
                ]);
            }
        }

        $order->update(['status' => OrderStatus::Cancelled]);
        $order->recordActivity(ActivityType::Cancelled, 'Cancelled by the customer.', $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Your order has been cancelled.')]);

        return to_route('account.orders.show', $order);
    }
}
