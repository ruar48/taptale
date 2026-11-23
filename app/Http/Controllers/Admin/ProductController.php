<?php

namespace App\Http\Controllers\Admin;

use App\Enums\OptionGroup;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    /**
     * List products.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();

        $products = Product::query()
            ->with(['images', 'categories:id,name,slug'])
            ->withCount('orders')
            ->when($search !== '', fn (Builder $query) => $query->where('name', 'like', "%{$search}%"))
            ->orderBy('sort_order')
            ->orderBy('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('admin/products/index', [
            'products' => ProductResource::collection($products),
            'filters' => ['search' => $search],
        ]);
    }

    /**
     * Show the form for creating a product.
     */
    public function create(): Response
    {
        return Inertia::render('admin/products/form', [
            'product' => null,
            ...$this->formOptions(),
        ]);
    }

    /**
     * Store a new product.
     */
    public function store(ProductRequest $request): RedirectResponse
    {
        $product = DB::transaction(function () use ($request): Product {
            $product = Product::create($request->productData());
            $product->categories()->sync($request->validated('category_ids'));

            return $product;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Product created. Add photos and options next.')]);

        return to_route('admin.products.edit', $product);
    }

    /**
     * Show the form for editing a product, its images and options.
     */
    public function edit(Product $product): Response
    {
        $product->load(['images', 'options', 'categories:id,name,slug']);

        return Inertia::render('admin/products/form', [
            'product' => new ProductResource($product),
            ...$this->formOptions(),
        ]);
    }

    /**
     * Update a product.
     */
    public function update(ProductRequest $request, Product $product): RedirectResponse
    {
        DB::transaction(function () use ($request, $product): void {
            $product->update($request->productData());
            $product->categories()->sync($request->validated('category_ids'));
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Product saved.')]);

        return to_route('admin.products.edit', $product);
    }

    /**
     * Delete a product. Existing orders keep their product snapshot.
     */
    public function destroy(Product $product): RedirectResponse
    {
        $disk = Storage::disk(config('taptale.media_disk'));

        foreach ($product->images as $image) {
            $disk->delete($image->path);
        }

        $product->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Product deleted.')]);

        return to_route('admin.products.index');
    }

    /**
     * Shared select options for the product form.
     *
     * @return array<string, mixed>
     */
    private function formOptions(): array
    {
        return [
            'categories' => Category::query()->orderBy('sort_order')->get(['id', 'name']),
            'optionGroups' => OptionGroup::options(),
            'artStyles' => Product::ART_STYLES,
        ];
    }
}
