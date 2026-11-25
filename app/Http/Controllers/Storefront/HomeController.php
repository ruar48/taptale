<?php

namespace App\Http\Controllers\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use App\Models\Testimonial;
use Illuminate\Http\Response as HttpResponse;
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
        $faqs = $this->faqs();

        return Inertia::render('storefront/home', [
            'categories' => CategoryResource::collection(Category::active()->get()),
            'featuredProducts' => ProductResource::collection($products->where('is_featured', true)->take(4)->values()),
            'bestsellers' => ProductResource::collection($products->where('is_bestseller', true)->take(4)->values()),
            'testimonials' => Testimonial::published()->limit(6)->get(['id', 'author_name', 'occasion', 'quote', 'rating']),
            'faqs' => $faqs,
            'seo' => [
                'title' => 'NFC Keychains & Photo Gifts in '.config('taptale.business.town'),
                'schema' => [...$this->structuredData(), $this->faqStructuredData($faqs)],
            ],
        ]);
    }

    /**
     * A plain-text summary of the shop for AI assistants (ChatGPT, Perplexity, Gemini,
     * Claude), following the llms.txt convention, so they can describe and recommend it
     * accurately: where it is, where it delivers, what it sells and what it costs.
     */
    public function llms(): HttpResponse
    {
        return response()
            ->view('llms', [
                'business' => config('taptale.business'),
                'description' => config('taptale.seo.description'),
                'categories' => Category::active()->get(['name', 'slug', 'tagline']),
                'products' => Product::active()->get(['name', 'slug', 'short_description', 'base_price']),
                'faqs' => $this->faqs(),
            ])
            ->header('Content-Type', 'text/plain; charset=UTF-8');
    }

    /**
     * Questions local customers ask before ordering. Rendered on the homepage (also in
     * the static shell search engines read) and sent to Google as FAQPage markup.
     *
     * @return list<array{question: string, answer: string}>
     */
    private function faqs(): array
    {
        $business = config('taptale.business');
        $nearbyTowns = implode(', ', array_diff($business['service_area'], [$business['town']]));

        return [
            [
                'question' => 'Where do you deliver?',
                'answer' => "For now we deliver to {$business['town']} and nearby towns and cities in {$business['province']}: {$nearbyTowns}. Live somewhere else? Message us before ordering and we'll let you know if we can get your gift to you.",
            ],
            [
                'question' => 'How does an NFC keychain work?',
                'answer' => 'Each keychain has a small NFC tag inside. Hold it to the back of a modern phone and your memory page opens in the browser, no app needed. A QR code is included for phones without NFC.',
            ],
            [
                'question' => 'Is the memory page included with my keychain?',
                'answer' => 'Yes. Every keychain comes with its own memory page at no extra cost. You design it with your photos, a video, a song and a message, and you can update it anytime from your account.',
            ],
            [
                'question' => 'Do you make keepsakes for an 18th debut?',
                'answer' => 'Yes. We make a personalized NFC keychain for the debutante with her photos, a video and messages from family and friends, plus matching souvenir keychains for the 18 roses, 18 candles and every guest.',
            ],
            [
                'question' => 'Can I get a keychain for every place I travel to?',
                'answer' => 'Yes. Make a travel keychain for each trip, like Dagupan, Baguio or the Hundred Islands, and put all your photos and videos from that place on its memory page. Tap it anytime to relive the trip.',
            ],
            [
                'question' => 'Can I see my design before it is made?',
                'answer' => 'Yes. Nothing goes into production until you approve your design. You can design it yourself or tell us your idea and our designers take it from there.',
            ],
            [
                'question' => 'How long does it take?',
                'answer' => "Production starts once you approve your design and usually takes a few working days. Delivery within {$business['town']} and nearby towns usually takes 1–2 working days after that.",
            ],
        ];
    }

    /**
     * @param  list<array{question: string, answer: string}>  $faqs
     * @return array<string, mixed>
     */
    private function faqStructuredData(array $faqs): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'FAQPage',
            'mainEntity' => array_map(fn (array $faq): array => [
                '@type' => 'Question',
                'name' => $faq['question'],
                'acceptedAnswer' => ['@type' => 'Answer', 'text' => $faq['answer']],
            ], $faqs),
        ];
    }

    /**
     * Local store and WebSite structured data, so Google can show the brand in results
     * and match the shop to searches from the towns it delivers to.
     *
     * @return list<array<string, mixed>>
     */
    private function structuredData(): array
    {
        $business = config('taptale.business');

        return [
            array_filter([
                '@context' => 'https://schema.org',
                '@type' => 'Store',
                'name' => $business['name'],
                'description' => config('taptale.seo.description'),
                'url' => url('/'),
                'logo' => url('/apple-touch-icon.png'),
                'image' => url(config('taptale.seo.image')),
                'email' => $business['email'],
                'telephone' => $business['phone'],
                'currenciesAccepted' => config('taptale.currency'),
                'address' => array_filter([
                    '@type' => 'PostalAddress',
                    'streetAddress' => $business['address'],
                    'addressLocality' => $business['town'],
                    'addressRegion' => $business['province'],
                    'addressCountry' => 'PH',
                ]),
                'geo' => filled($business['latitude']) && filled($business['longitude']) ? [
                    '@type' => 'GeoCoordinates',
                    'latitude' => (float) $business['latitude'],
                    'longitude' => (float) $business['longitude'],
                ] : null,
                'areaServed' => array_map(fn (string $town): array => [
                    '@type' => 'City',
                    'name' => "{$town}, {$business['province']}",
                ], $business['service_area']),
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
