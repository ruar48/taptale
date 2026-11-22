<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Testimonial;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Moderate customer reviews and other storefront testimonials.
 */
class ReviewController extends Controller
{
    /**
     * List reviews, waiting ones first.
     */
    public function index(): Response
    {
        $reviews = Testimonial::query()
            ->with('order:id,reference,product_name')
            ->orderBy('is_published')
            ->latest()
            ->latest('id')
            ->paginate(30);

        return Inertia::render('admin/reviews/index', [
            'reviews' => $reviews->through(fn (Testimonial $review): array => [
                'id' => $review->id,
                'author_name' => $review->author_name,
                'occasion' => $review->occasion,
                'quote' => $review->quote,
                'rating' => $review->rating,
                'is_published' => $review->is_published,
                'order' => $review->order ? [
                    'reference' => $review->order->reference,
                    'product_name' => $review->order->product_name,
                ] : null,
                'created_at' => $review->created_at?->toIso8601String(),
            ]),
            'pendingCount' => Testimonial::query()->where('is_published', false)->count(),
        ]);
    }

    /**
     * Publish or hide a review on the storefront.
     */
    public function update(Request $request, Testimonial $review): RedirectResponse
    {
        $validated = $request->validate([
            'is_published' => ['required', 'boolean'],
        ]);

        $review->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => $review->is_published ? __('Review published.') : __('Review hidden.')]);

        return back();
    }

    /**
     * Delete a review.
     */
    public function destroy(Testimonial $review): RedirectResponse
    {
        $review->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Review deleted.')]);

        return back();
    }
}
