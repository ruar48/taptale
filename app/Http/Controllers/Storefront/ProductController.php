<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Http\Resources\TemplateResource;
use App\Models\Product;
use App\Models\Template;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    /**
     * Show a product's details, options and matching templates.
     */
    public function show(Request $request, Product $product): Response
    {
        abort_unless($product->is_active, 404);

        $product->load([
            'images',
            'options' => fn ($query) => $query->where('is_active', true),
            'categories' => fn ($query) => $query->where('is_active', true)->orderBy('sort_order'),
        ]);

        $categoryIds = $product->categories->modelKeys();

        $selectedCategory = $product->categories->firstWhere('slug', $request->query('category'))
            ?? $product->categories->first();

        $templates = Template::active()
            ->whereHas('categories', fn (Builder $query) => $query->whereKey($categoryIds))
            ->where(fn (Builder $query) => $query
                ->whereDoesntHave('products')
                ->orWhereHas('products', fn (Builder $products) => $products->whereKey($product->id)))
            ->limit(8)
            ->get();

        $related = Product::active()
            ->whereKeyNot($product->id)
            ->whereHas('categories', fn (Builder $query) => $query->whereKey($categoryIds))
            ->with('images')
            ->limit(4)
            ->get();

        return Inertia::render('storefront/products/show', [
            'product' => new ProductResource($product),
            'selectedCategorySlug' => $selectedCategory?->slug,
            'templates' => TemplateResource::collection($templates),
            'relatedProducts' => ProductResource::collection($related),
        ]);
    }
}
