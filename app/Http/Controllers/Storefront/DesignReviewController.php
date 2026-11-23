<?php

namespace App\Http\Controllers\Storefront;

use App\Actions\Orders\RespondToDesignProof;
use App\Http\Controllers\Controller;
use App\Models\DesignProof;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The private approval link the studio sends a customer (over Messenger, for
 * example) so they can see their design and approve it or ask for changes
 * without an account. The link carries a secret "k" key; without it, or once
 * the studio turns the link off, every page here is a 404.
 */
class DesignReviewController extends Controller
{
    /**
     * Show the order's designs and let the customer answer the newest one.
     */
    public function show(Request $request, Order $order): Response
    {
        $key = $this->authorizeKey($request, $order);

        $order->load('proofs');
        $latestProof = $order->proofs->first();

        return Inertia::render('storefront/design-review', [
            'accessKey' => $key,
            'order' => [
                'reference' => $order->reference,
                'customer_first_name' => str($order->customer_name)->before(' ')->toString(),
                'product_name' => $order->product_name,
                'quantity' => $order->quantity,
                'status_label' => $order->status->label(),
                'status_tone' => $order->status->tone(),
                'is_open' => $order->status->isOpen(),
                'is_payment_stage' => $order->status->isPaymentStage(),
                'personalization' => (object) $order->personalization,
            ],
            'proofs' => $order->proofs->map(fn (DesignProof $proof): array => [
                'id' => $proof->id,
                'version' => $proof->version,
                'status' => $proof->status->value,
                'status_label' => $proof->status->label(),
                'designer_notes' => $proof->designer_notes,
                'customer_comment' => $proof->customer_comment,
                'responded_at' => $proof->responded_at?->toIso8601String(),
                'auto_approves_at' => $proof->autoApprovesAt()?->toIso8601String(),
                'image_url' => route('design-review.proof', ['order' => $order, 'proof' => $proof, 'k' => $key]),
                'created_at' => $proof->created_at?->toIso8601String(),
                'is_awaiting_response' => $proof->is($latestProof) && $proof->isAwaitingResponse() && $order->status->isOpen(),
            ])->values(),
        ]);
    }

    /**
     * Stream one of the order's design images.
     */
    public function proof(Request $request, Order $order, DesignProof $proof): StreamedResponse
    {
        $this->authorizeKey($request, $order);

        abort_unless($proof->order_id === $order->id, 404);

        $storage = Storage::disk($proof->disk);

        abort_unless($storage->exists($proof->path), 404);

        return $storage->response($proof->path, null, [
            'Cache-Control' => 'private, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /**
     * Approve the newest design.
     */
    public function approve(Request $request, Order $order, DesignProof $proof, RespondToDesignProof $respond): RedirectResponse
    {
        $this->authorizeKey($request, $order);

        $validated = $request->validate([
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        $respond->approve($order, $proof, $validated['comment'] ?? null, $order->user);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Design approved! Thank you — we will start making your gift soon.')]);

        return back();
    }

    /**
     * Ask the studio to change the newest design.
     */
    public function requestRevision(Request $request, Order $order, DesignProof $proof, RespondToDesignProof $respond): RedirectResponse
    {
        $this->authorizeKey($request, $order);

        $validated = $request->validate([
            'comment' => ['required', 'string', 'min:5', 'max:2000'],
        ], ['comment.required' => 'Please tell us what you would like to change.']);

        $respond->requestRevision($order, $proof, $validated['comment'], $order->user);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Thanks! Our designers will revise your design.')]);

        return back();
    }

    /**
     * The link's key, or a 404 when it does not open this order.
     */
    private function authorizeKey(Request $request, Order $order): string
    {
        $key = $request->query('k');

        abort_unless($order->hasApprovalToken($key), 404);

        return $key;
    }
}
