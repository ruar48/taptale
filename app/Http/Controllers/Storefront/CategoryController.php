<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\TemplateResource;
use App\Models\Category;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    /**
     * List every gift category.
     */
    public function index(): Response
    {
        return Inertia::render('storefront/categories/index', [
            'categories' => CategoryResource::collection(
                Category::active()->withCount(['products' => fn (Builder $query) => $query->where('is_active', true)])->get()
            ),
            'seo' => [
                'title' => 'Shop by Occasion',
                'description' => 'Personalized gifts for weddings, anniversaries, birthdays, baptisms, graduations and more — NFC keychains and photo keepsakes made to order.',
            ],
        ]);
    }

    /**
     * Show a category with its products and templates.
     */
    public function show(Category $category): Response
    {
        abort_unless($category->is_active, 404);

        return Inertia::render('storefront/categories/show', [
            'category' => new CategoryResource($category),
            'products' => ProductResource::collection(
                $category->products()->active()->with('images')->get()
            ),
            'templates' => TemplateResource::collection($category->templates()->active()->get()),
            'otherCategories' => CategoryResource::collection(
                Category::active()->whereKeyNot($category->id)->limit(6)->get()
            ),
            'seo' => [
                'title' => $category->name,
                'description' => Str::limit(strip_tags($category->description ?: $category->tagline ?: "Personalized {$category->name} — NFC keychains and photo keepsakes made to order."), 160),
                'image' => $category->image_url,
            ],
        ]);
    }
}
