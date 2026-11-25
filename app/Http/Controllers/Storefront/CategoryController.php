<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\ProductResource;
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
                'title' => 'Personalized Gifts by Occasion in '.config('taptale.business.town'),
                'description' => 'Personalized gifts for weddings, anniversaries, birthdays, 18th debuts, graduations and trips — NFC keychains and photo keepsakes made in '.$this->madeIn().'.',
            ],
        ]);
    }

    /**
     * Show a category with its products.
     */
    public function show(Category $category): Response
    {
        abort_unless($category->is_active, 404);

        return Inertia::render('storefront/categories/show', [
            'category' => new CategoryResource($category),
            'products' => ProductResource::collection(
                $category->products()->active()->with('images')->get()
            ),
            'otherCategories' => CategoryResource::collection(
                Category::active()->whereKeyNot($category->id)->limit(6)->get()
            ),
            'seo' => [
                'title' => "{$category->name} in ".config('taptale.business.town'),
                'description' => Str::limit(trim(strip_tags($category->tagline ?: "Personalized {$category->name}.").' NFC keychains and photo keepsakes made in '.$this->madeIn().', delivered to nearby towns.'), 160),
                'image' => $category->image_url,
            ],
        ]);
    }

    /**
     * "Binalonan, Pangasinan": where the studio is, for the local search wording.
     */
    private function madeIn(): string
    {
        return config('taptale.business.town').', '.config('taptale.business.province');
    }
}
