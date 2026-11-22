<?php

use App\Actions\Errors\RenderErrorResponse;
use App\Models\DigitalExperience;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();

    Route::middleware('web')->group(function () {
        Route::match(['get', 'post'], '__errors/abort/{status}', fn (string $status) => abort((int) $status));
        Route::post('__errors/crash', fn () => throw new RuntimeException('Boom'));
        Route::post('__errors/throttled', fn () => 'ok')->middleware('throttle:1,1');
    });
});

test('a missing page opened directly renders the Taptale 404 page', function () {
    $this->get('/this-page-does-not-exist')
        ->assertNotFound()
        ->assertInertia(fn (Assert $page) => $page
            ->component('storefront/error')
            ->where('status', 404));
});

test('a missing page clicked from inside the site renders the 404 page without a reload', function () {
    $this->withHeaders(['X-Inertia' => 'true'])
        ->get('/this-page-does-not-exist')
        ->assertNotFound()
        ->assertHeader('X-Inertia', 'true')
        ->assertJson(['component' => 'storefront/error', 'props' => ['status' => 404]]);
});

test('each error status renders the Taptale error page', function (int $status) {
    config(['app.debug' => false]);

    $this->get("/__errors/abort/{$status}")
        ->assertStatus($status)
        ->assertInertia(fn (Assert $page) => $page
            ->component('storefront/error')
            ->where('status', $status));
})->with([
    'forbidden' => 403,
    'page expired' => 419,
    'too many requests' => 429,
    'server error' => 500,
    'maintenance' => 503,
]);

test('server errors keep the debug page while debugging', function () {
    config(['app.debug' => true]);

    $this->withHeaders(['X-Inertia' => 'true'])
        ->post('/__errors/crash')
        ->assertServerError()
        ->assertHeaderMissing('X-Inertia');
});

test('a memory page that does not open explains how to open it', function (string $address) {
    $this->get($address)
        ->assertNotFound()
        ->assertInertia(fn (Assert $page) => $page->component('storefront/experience-unavailable'));
})->with([
    'link copied without the tag' => fn () => route('experiences.show', DigitalExperience::factory()->create()),
    'unknown code' => fn () => route('experiences.show', 'no-such-code'),
]);

test('missing photos and file-like paths get a bare 404 instead of a page', function (string $address) {
    $response = $this->get($address);

    $response->assertNotFound();
    expect($response->getContent())->not->toContain('data-page');
})->with([
    'memory page photo' => fn () => route('experiences.photo', ['experience' => DigitalExperience::factory()->create(), 'index' => 3]),
    'bot probing a php file' => fn () => '/wp-login.php',
]);

test('a JSON request keeps a JSON error', function () {
    $this->getJson('/this-page-does-not-exist')
        ->assertNotFound()
        ->assertJsonStructure(['message']);
});

test('a visitor who keeps hitting missing pages gets a bare 429 while real pages keep working', function () {
    foreach (range(1, RenderErrorResponse::NOT_FOUND_LIMIT) as $attempt) {
        $this->get("/missing-page-{$attempt}")->assertNotFound();
    }

    $response = $this->get('/one-more-missing-page');

    $response->assertTooManyRequests()->assertHeader('Retry-After');
    expect($response->getContent())->not->toContain('data-page');
    $this->get(route('home'))->assertOk();
});

test('a failed submission from the site goes back to the page with a toast', function (int $status, string $type, string $message) {
    config(['app.debug' => false]);

    $this->from('/gifts')
        ->withHeaders(['X-Inertia' => 'true'])
        ->post("/__errors/abort/{$status}")
        ->assertStatus(303)
        ->assertRedirect('/gifts')
        ->assertInertiaFlash('toast', ['type' => $type, 'message' => $message]);
})->with([
    'forbidden' => [403, 'error', 'You do not have permission to do that.'],
    'not found' => [404, 'error', 'We could not find that. It may have been removed.'],
    'page expired' => [419, 'warning', 'This page expired. Please try again.'],
    'server error' => [500, 'error', 'Something went wrong on our side. Please try again in a moment.'],
    'maintenance' => [503, 'warning', 'Taptale is getting a quick update. Please try again in a few minutes.'],
]);

test('a throttled submission from the site says how long to wait', function () {
    $this->freezeTime();

    $this->withHeaders(['X-Inertia' => 'true'])->post('/__errors/throttled')->assertOk();

    $this->from('/gifts')
        ->withHeaders(['X-Inertia' => 'true'])
        ->post('/__errors/throttled')
        ->assertRedirect('/gifts')
        ->assertInertiaFlash('toast', [
            'type' => 'warning',
            'message' => 'Too many attempts. Please wait 60 seconds and try again.',
        ]);
});
