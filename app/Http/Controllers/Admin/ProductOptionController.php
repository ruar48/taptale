<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProductOptionRequest;
use App\Models\Product;
use App\Models\ProductOption;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class ProductOptionController extends Controller
{
    /**
     * Add an option (size, material, add-on, ...) to a product.
     */
    public function store(ProductOptionRequest $request, Product $product): RedirectResponse
    {
        $option = $product->options()->create($request->optionData());

        $this->keepSingleDefault($option);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Option added.')]);

        return back();
    }

    /**
     * Update a product option.
     */
    public function update(ProductOptionRequest $request, Product $product, ProductOption $option): RedirectResponse
    {
        abort_unless($option->product_id === $product->id, 404);

        $option->update($request->optionData());

        $this->keepSingleDefault($option);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Option updated.')]);

        return back();
    }

    /**
     * Remove a product option. Placed orders keep their option snapshot.
     */
    public function destroy(Product $product, ProductOption $option): RedirectResponse
    {
        abort_unless($option->product_id === $product->id, 404);

        $option->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Option removed.')]);

        return back();
    }

    /**
     * Single-choice groups may only have one default option.
     */
    private function keepSingleDefault(ProductOption $option): void
    {
        if (! $option->is_default || $option->group->allowsMultiple()) {
            return;
        }

        ProductOption::query()
            ->where('product_id', $option->product_id)
            ->where('group', $option->group)
            ->whereKeyNot($option->id)
            ->update(['is_default' => false]);
    }
}
