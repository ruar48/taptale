<?php

namespace App\Http\Controllers\Account;

use App\Enums\ActivityType;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Testimonial;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Lets a customer review an order once it has reached them. Reviews stay
 * hidden until an administrator publishes them.
 */
class ReviewController extends Controller
{
    /**
     * Save the customer's review of their order.
     */
    public function store(Request $request, Order $order): RedirectResponse
    {
        Gate::authorize('update', $order);

        if (! $order->isReviewable()) {
            throw ValidationException::withMessages(['review' => 'You can review your order once it has been delivered.']);
        }

        if ($order->review()->exists()) {
            throw ValidationException::withMessages(['review' => 'You already reviewed this order. Thank you!']);
        }

        $validated = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'quote' => ['required', 'string', 'min:10', 'max:1000'],
            'author_name' => ['required', 'string', 'max:80'],
        ], [
            'quote.required' => 'Please tell us a little about your gift.',
            'quote.min' => 'Please write at least a sentence.',
        ], [
            'quote' => 'review',
            'author_name' => 'display name',
        ]);

        $review = new Testimonial([
            ...$validated,
            'occasion' => $order->category?->name,
            'is_published' => false,
        ]);
        $review->order()->associate($order);
        $review->user()->associate($request->user());
        $review->save();

        $order->recordActivity(ActivityType::ReviewSubmitted, "Rated {$validated['rating']}/5.", $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Thank you for your review!')]);

        return back();
    }
}
