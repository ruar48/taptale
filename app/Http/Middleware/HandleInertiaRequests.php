<?php

namespace App\Http\Middleware;

use App\Models\Category;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'storefront' => [
                'currencySymbol' => config('taptale.currency_symbol'),
                'tagline' => 'Every tap tells a story.',
                'deliveryFee' => (int) config('taptale.delivery_fee'),
                'freeDeliveryThreshold' => (int) config('taptale.free_delivery_threshold'),
                'business' => config('taptale.business'),
                'policiesUpdatedOn' => config('taptale.policies_updated_on'),
            ],
            'navCategories' => Inertia::once(fn () => Category::active()->get(['id', 'name', 'slug', 'accent_color'])),
        ];
    }
}
