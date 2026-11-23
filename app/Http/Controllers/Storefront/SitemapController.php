<?php

namespace App\Http\Controllers\Storefront;

use App\Enums\ExperienceTemplate;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    /**
     * List every public storefront page for search engines.
     */
    public function __invoke(): Response
    {
        $urls = [
            ['loc' => route('home'), 'priority' => '1.0'],
            ['loc' => route('categories.index'), 'priority' => '0.9'],
            ['loc' => route('experiences.templates'), 'priority' => '0.8'],
            ['loc' => route('orders.create'), 'priority' => '0.7'],
            ...Category::active()->get(['slug', 'updated_at'])->map(fn (Category $category): array => [
                'loc' => route('categories.show', $category),
                'lastmod' => $category->updated_at?->toAtomString(),
                'priority' => '0.8',
            ]),
            ...Product::active()->get(['slug', 'updated_at'])->map(fn (Product $product): array => [
                'loc' => route('products.show', $product),
                'lastmod' => $product->updated_at?->toAtomString(),
                'priority' => '0.9',
            ]),
            ...array_map(fn (ExperienceTemplate $template): array => [
                'loc' => route('experiences.demo', $template->value),
                'priority' => '0.5',
            ], ExperienceTemplate::cases()),
            ...array_map(fn (string $page): array => [
                'loc' => route("pages.{$page}"),
                'priority' => '0.3',
            ], ['about', 'shipping', 'returns', 'terms', 'privacy', 'cookies']),
        ];

        return response()
            ->view('sitemap', ['urls' => $urls])
            ->header('Content-Type', 'application/xml; charset=UTF-8');
    }
}
