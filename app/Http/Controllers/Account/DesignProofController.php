<?php

namespace App\Http\Controllers\Account;

use App\Actions\Orders\RespondToDesignProof;
use App\Http\Controllers\Controller;
use App\Models\DesignProof;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class DesignProofController extends Controller
{
    /**
     * Approve the latest design proof.
     */
    public function approve(Request $request, Order $order, DesignProof $proof, RespondToDesignProof $respond): RedirectResponse
    {
        Gate::authorize('update', $order);

        $validated = $request->validate([
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        $respond->approve($order, $proof, $validated['comment'] ?? null, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => $order->status->isPaymentStage()
            ? __('Design approved! We will start production once your payment is complete.')
            : __('Design approved! We will start production soon.')]);

        return back();
    }

    /**
     * Request changes to the latest design proof.
     */
    public function requestRevision(Request $request, Order $order, DesignProof $proof, RespondToDesignProof $respond): RedirectResponse
    {
        Gate::authorize('update', $order);

        $validated = $request->validate([
            'comment' => ['required', 'string', 'min:5', 'max:2000'],
        ], ['comment.required' => 'Please tell us what you would like to change.']);

        $respond->requestRevision($order, $proof, $validated['comment'], $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Thanks! Our designers will revise your design.')]);

        return back();
    }
}
