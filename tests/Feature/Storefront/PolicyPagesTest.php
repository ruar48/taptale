<?php

use Inertia\Testing\AssertableInertia as Assert;

test('guests can read every about and policy page', function (string $route, string $component) {
    $this->get(route($route))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component($component));
})->with([
    'about' => ['pages.about', 'storefront/pages/about'],
    'terms' => ['pages.terms', 'storefront/pages/terms'],
    'privacy' => ['pages.privacy', 'storefront/pages/privacy'],
    'cookies' => ['pages.cookies', 'storefront/pages/cookies'],
    'shipping' => ['pages.shipping', 'storefront/pages/shipping'],
    'returns' => ['pages.returns', 'storefront/pages/returns'],
]);

test('policy pages show the configured business details and delivery fees', function () {
    config([
        'taptale.business.name' => 'Taptale Gifts',
        'taptale.business.email' => 'help@taptale.test',
        'taptale.business.phone' => null,
        'taptale.delivery_fee' => 12000,
        'taptale.free_delivery_threshold' => 250000,
    ]);

    $this->get(route('pages.shipping'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('storefront.business.name', 'Taptale Gifts')
            ->where('storefront.business.email', 'help@taptale.test')
            ->where('storefront.business.phone', null)
            ->where('storefront.deliveryFee', 12000)
            ->where('storefront.freeDeliveryThreshold', 250000)
        );
});
