<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\TemplateResource;
use App\Models\Category;
use App\Models\Product;
use App\Models\Template;
use App\Models\Testimonial;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    /**
     * Show the storefront homepage.
     */
    public function __invoke(): Response
    {
        $products = Product::active()->with('images')->get();

        return Inertia::render('storefront/home', [
            'categories' => CategoryResource::collection(Category::active()->get()),
            'featuredProducts' => ProductResource::collection($products->where('is_featured', true)->take(4)->values()),
            'bestsellers' => ProductResource::collection($products->where('is_bestseller', true)->take(4)->values()),
            'featuredTemplates' => TemplateResource::collection(
                Template::active()->where('is_featured', true)->with('categories:id,name,slug')->limit(6)->get()
            ),
            'testimonials' => Testimonial::published()->limit(6)->get(['id', 'author_name', 'occasion', 'quote', 'rating']),
        ]);
    }
}
