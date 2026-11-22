<?php

use App\Enums\DesignMode;
use App\Enums\ExperienceTemplate;
use App\Enums\OptionGroup;
use App\Models\Category;
use App\Models\DigitalExperience;
use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\ProductOption;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('the memory page gallery lists every template', function () {
    $this->get(route('experiences.templates'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('storefront/memory-pages')
            ->has('templates', count(ExperienceTemplate::cases())));
});

test('every template has a live demo', function (ExperienceTemplate $template) {
    $this->get(route('experiences.demo', $template->value))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('storefront/experience')
            ->where('isDemo', true)
            ->where('experience.template', $template->value)
            ->where('experience.theme', $template->defaultTheme())
            ->has('experience.moments', 6));
})->with(ExperienceTemplate::cases());

test('an unknown demo template is not found', function () {
    $this->get(route('experiences.demo', 'does-not-exist'))->assertNotFound();
});

test('timeline moments follow their photos when other photos are removed', function () {
    Storage::fake('local');
    $experience = DigitalExperience::factory()->create(['photos' => ['experiences/a.jpg', 'experiences/b.jpg', 'experiences/c.jpg']]);
    Storage::disk('local')->put('experiences/a.jpg', 'a');

    $this->actingAs($experience->user)
        ->put(route('account.experiences.update', $experience), [
            'template' => 'love_story',
            'theme' => 'blush',
            'title' => 'How we happened',
            'remove_photos' => [0],
            'moments' => [
                ['date' => 'June 2', 'title' => 'Baguio', 'caption' => 'Our first trip', 'photo' => 2],
                ['date' => 'May 1', 'title' => 'Gone photo', 'caption' => null, 'photo' => 0],
                ['date' => null, 'title' => null, 'caption' => null, 'photo' => null],
            ],
        ])
        ->assertSessionHasNoErrors();

    $experience->refresh();

    expect($experience->template)->toBe(ExperienceTemplate::LoveStory)
        ->and($experience->photos)->toBe(['experiences/b.jpg', 'experiences/c.jpg'])
        ->and($experience->moments)->toBe([
            ['date' => 'June 2', 'title' => 'Baguio', 'caption' => 'Our first trip', 'photo' => 1],
            ['date' => 'May 1', 'title' => 'Gone photo', 'caption' => null, 'photo' => null],
        ]);

    Storage::disk('local')->assertMissing('experiences/a.jpg');
});

test('a page can have at most twelve moments', function () {
    $experience = DigitalExperience::factory()->create();

    $this->actingAs($experience->user)
        ->put(route('account.experiences.update', $experience), [
            'template' => 'love_story',
            'theme' => 'blush',
            'title' => 'Us',
            'moments' => array_fill(0, 13, ['title' => 'Moment']),
        ])
        ->assertSessionHasErrors(['moments' => 'You can add up to 12 moments.']);
});

test('only known templates and themes are accepted', function () {
    $experience = DigitalExperience::factory()->create();

    $this->actingAs($experience->user)
        ->put(route('account.experiences.update', $experience), [
            'template' => 'mystery',
            'theme' => 'neon',
            'title' => 'Us',
        ])
        ->assertSessionHasErrors(['template', 'theme']);
});

test('the uploaded song plays on the published page and stays private when unpublished', function () {
    Storage::fake('local');
    $experience = DigitalExperience::factory()->create();

    $this->actingAs($experience->user)
        ->put(route('account.experiences.update', $experience), [
            'template' => 'monthsary',
            'theme' => 'crimson',
            'title' => 'Happy Monthsary',
            'is_published' => true,
            'audio' => UploadedFile::fake()->create('our-song.mp3', 500, 'audio/mpeg'),
        ])
        ->assertSessionHasNoErrors();

    $experience->refresh();
    Storage::disk('local')->assertExists($experience->audio_path);

    auth()->logout();
    tapTag($experience);
    $this->get(route('experiences.audio', $experience))->assertOk();

    $experience->update(['is_published' => false]);
    $this->get(route('experiences.audio', $experience))->assertNotFound();
    $this->actingAs($experience->user)->get(route('experiences.audio', $experience))->assertOk();
});

test('non-audio files are rejected as the background song', function () {
    $experience = DigitalExperience::factory()->create();

    $this->actingAs($experience->user)
        ->put(route('account.experiences.update', $experience), [
            'template' => 'monthsary',
            'theme' => 'crimson',
            'title' => 'Us',
            'audio' => UploadedFile::fake()->create('virus.exe', 10, 'application/x-msdownload'),
        ])
        ->assertSessionHasErrors('audio');
});

test('removing the song deletes the file', function () {
    Storage::fake('local');
    Storage::disk('local')->put('experiences/1/audio/song.mp3', 'music');
    $experience = DigitalExperience::factory()->create();
    $experience->forceFill(['audio_path' => 'experiences/1/audio/song.mp3'])->save();

    $this->actingAs($experience->user)
        ->put(route('account.experiences.update', $experience), [
            'template' => 'monthsary',
            'theme' => 'crimson',
            'title' => 'Us',
            'remove_audio' => true,
        ])
        ->assertSessionHasNoErrors();

    expect($experience->fresh()->audio_path)->toBeNull();
    Storage::disk('local')->assertMissing('experiences/1/audio/song.mp3');
});

test('a new memory page starts with the design that suits the occasion', function () {
    $category = Category::factory()->create(['slug' => 'couple-gifts']);
    $product = Product::factory()->withDigitalExperience()->create();
    $category->products()->attach($product);
    $size = ProductOption::factory()->for($product)->group(OptionGroup::Size)->create();
    $customer = User::factory()->create();

    $this->actingAs($customer)->post(route('orders.store'), [
        'category_id' => $category->id,
        'product_id' => $product->id,
        'design_mode' => DesignMode::TaptaleDesigned->value,
        'option_ids' => [$size->id],
        'quantity' => 1,
        'personalization' => ['design_brief' => 'Something sweet', 'song_title' => 'Golden Hour', 'artist' => 'JVKE'],
        'customer_name' => 'Ana',
        'customer_email' => 'ana@example.com',
        'customer_phone' => '09171234567',
        'address_line' => '12 Street',
        'city' => 'Manila',
        'province' => 'Metro Manila',
        'postal_code' => '1000',
        'payment_method_id' => PaymentMethod::factory()->create()->id,
    ])->assertSessionHasNoErrors();

    $order = Order::sole();

    expect($order->personalization)->toMatchArray(['song_title' => 'Golden Hour', 'artist' => 'JVKE'])
        ->and($order->experience->template)->toBe(ExperienceTemplate::Monthsary)
        ->and($order->experience->theme)->toBe('crimson')
        ->and($order->experience->song_title)->toBe('Golden Hour');
});
