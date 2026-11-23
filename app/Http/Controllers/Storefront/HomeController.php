<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
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
            'testimonials' => Testimonial::published()->limit(6)->get(['id', 'author_name', 'occasion', 'quote', 'rating']),
            'seo' => [
                'title' => 'Personalized NFC & Photo Keepsakes',
                'schema' => $this->structuredData(),
            ],
        ]);
    }

    /**
     * Organization and WebSite structured data so Google can show the brand in results.
     *
     * @return list<array<string, mixed>>
     */
    private function structuredData(): array
    {
        $business = config('taptale.business');

        return [
            array_filter([
                '@context' => 'https://schema.org',
                '@type' => 'Organization',
                'name' => $business['name'],
                'url' => url('/'),
                'logo' => url('/apple-touch-icon.png'),
                'email' => $business['email'],
                'telephone' => $business['phone'],
                'sameAs' => array_values(array_filter([$business['facebook_url'], $business['instagram_url']])) ?: null,
            ]),
            [
                '@context' => 'https://schema.org',
                '@type' => 'WebSite',
                'name' => $business['name'],
                'url' => url('/'),
            ],
        ];
    }
}
