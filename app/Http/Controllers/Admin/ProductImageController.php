<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\File;
use Inertia\Inertia;

class ProductImageController extends Controller
{
    /**
     * Upload product gallery images.
     */
    public function store(Request $request, Product $product): RedirectResponse
    {
        $validated = $request->validate([
            'images' => ['required', 'array', 'min:1', 'max:10'],
            'images.*' => [File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(6144)],
        ], attributes: ['images.*' => 'image']);

        $position = (int) $product->images()->max('sort_order');

        foreach ($validated['images'] as $image) {
            $product->images()->create([
                'path' => $image->store("products/{$product->id}", config('taptale.media_disk')),
                'alt' => $product->name,
                'sort_order' => ++$position,
            ]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Images uploaded.')]);

        return back();
    }

    /**
     * Make an image the product's cover photo.
     */
    public function update(Product $product, ProductImage $image): RedirectResponse
    {
        abort_unless($image->product_id === $product->id, 404);

        $image->update(['sort_order' => ((int) $product->images()->min('sort_order')) - 1]);

        return back();
    }

    /**
     * Delete a product image.
     */
    public function destroy(Product $product, ProductImage $image): RedirectResponse
    {
        abort_unless($image->product_id === $product->id, 404);

        Storage::disk(config('taptale.media_disk'))->delete($image->path);
        $image->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Image removed.')]);

        return back();
    }
}
