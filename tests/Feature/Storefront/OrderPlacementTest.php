<?php

use App\Enums\DesignMode;
use App\Enums\OptionGroup;
use App\Enums\OrderFileKind;
use App\Enums\OrderStatus;
use App\Models\Category;
use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\ProductOption;
use App\Models\PromoCode;
use App\Models\User;
use App\Notifications\AdminOrderAlert;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    config(['taptale.delivery_fee' => 15000, 'taptale.free_delivery_threshold' => 0]);

    $this->category = Category::factory()->create();
    $this->product = Product::factory()->create(['base_price' => 15000, 'design_fee' => 5000, 'min_quantity' => 1, 'max_photos' => 2]);
    $this->category->products()->attach($this->product);

    $this->small = ProductOption::factory()->for($this->product)->group(OptionGroup::Size)->create(['name' => 'Small']);
    $this->large = ProductOption::factory()->for($this->product)->group(OptionGroup::Size)->costing(4500)->create(['name' => 'Large']);
    $this->charm = ProductOption::factory()->for($this->product)->group(OptionGroup::AddOn)->costing(2500)->create(['name' => 'Charm']);

    $this->paymentMethod = PaymentMethod::factory()->create();
    $this->customer = User::factory()->create();
});

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function orderPayload(object $test, array $overrides = []): array
{
    return array_replace([
        'category_id' => $test->category->id,
        'product_id' => $test->product->id,
        'design_mode' => DesignMode::SelfCustomized->value,
        'option_ids' => [$test->large->id, $test->charm->id],
        'quantity' => 2,
        'personalization' => ['names' => 'Ana & Leo', 'message' => 'Forever'],
        'approve_preview' => true,
        'customer_name' => 'Ana Cruz',
        'customer_email' => 'ana@example.com',
        'customer_phone' => '0917 123 4567',
        'address_line' => '12 Sampaguita St.',
        'city' => 'Quezon City',
        'province' => 'Metro Manila',
        'postal_code' => '1100',
        'payment_method_id' => $test->paymentMethod->id,
    ], $overrides);
}

test('guests can craft a gift but must have an account to place the order', function () {
    $this->get(route('orders.create', ['product' => $this->product->slug]))
        ->assertInertia(fn ($page) => $page
            ->component('storefront/create')
            ->where('selectedProduct.id', $this->product->id)
            ->where('customer', null)
            ->whereType('passwordRules', 'string'));

    $this->post(route('orders.store'), orderPayload($this))->assertRedirect(route('login'));

    expect(Order::count())->toBe(0);
});

test('signing up from the wizard brings the guest back to their gift', function () {
    $wizardUrl = route('orders.create', ['product' => $this->product->slug]);
    $this->get($wizardUrl)->assertOk();

    $this->post(route('register.store'), [
        'name' => 'Ana Cruz',
        'email' => 'ana@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertRedirect($wizardUrl);

    $this->assertAuthenticated();
});

test('a guest who only browsed the wizard is sent to the dashboard after logging in', function () {
    $this->get(route('orders.create'))->assertOk();

    $this->post(route('login.store'), [
        'email' => $this->customer->email,
        'password' => 'password',
    ])->assertRedirect(route('dashboard'));
});

test('logging in from the wizard brings the customer back to their gift', function () {
    $wizardUrl = route('orders.create', ['product' => $this->product->slug]);
    $this->get($wizardUrl)->assertOk();

    $this->post(route('login.store'), [
        'email' => $this->customer->email,
        'password' => 'password',
    ])->assertRedirect($wizardUrl);
});

test('the wizard starts with every gift and an occasion only narrows the list', function () {
    $otherProduct = Product::factory()->create();
    Product::factory()->inactive()->create();

    $this->actingAs($this->customer)->get(route('orders.create'))
        ->assertInertia(fn ($page) => $page
            ->component('storefront/create')
            ->where('selectedCategory', null)
            ->has('products', 2));

    $this->actingAs($this->customer)->get(route('orders.create', ['category' => $this->category->slug]))
        ->assertInertia(fn ($page) => $page
            ->where('selectedCategory.id', $this->category->id)
            ->has('products', 1)
            ->where('products.0.id', $this->product->id));

    $this->actingAs($this->customer)->get(route('orders.create', ['product' => $otherProduct->slug]))
        ->assertInertia(fn ($page) => $page->where('selectedProduct.id', $otherProduct->id));
});

test('a new customer can personalize a gift before confirming their email', function () {
    $newCustomer = User::factory()->unverified()->create();

    $this->actingAs($newCustomer)->get(route('orders.create'))->assertOk();
    $this->actingAs($newCustomer)->get(route('dashboard'))->assertOk();
});

test('the email must be confirmed before the order is placed', function () {
    $newCustomer = User::factory()->unverified()->create();

    $this->actingAs($newCustomer)->post(route('orders.store'), orderPayload($this))
        ->assertSessionHasErrors(['email_verification' => 'Please confirm your email address before placing your order.']);

    expect(Order::count())->toBe(0);
});

test('a gift can be ordered without choosing an occasion', function () {
    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'category_id' => null,
    ]))->assertSessionHasNoErrors()->assertRedirect();

    expect(Order::sole()->category_id)->toBe($this->category->id);
});

test('a customer places a self-customized order priced on the server', function () {
    $photo = UploadedFile::fake()->image('us.jpg');

    $response = $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'photos' => [$photo],
    ]));

    $order = Order::sole();

    $response->assertRedirect(route('account.orders.show', $order));

    expect($order)
        ->user_id->toBe($this->customer->id)
        ->status->toBe(OrderStatus::AwaitingPayment)
        ->unit_price->toBe(15000 + 4500 + 2500)
        ->subtotal->toBe(22000 * 2)
        ->customization_fee->toBe(0)
        ->delivery_fee->toBe(15000)
        ->total->toBe(44000 + 15000)
        ->preview_approved_at->not->toBeNull()
        ->and($order->isDesignApproved())->toBeTrue()
        ->and(collect($order->selected_options)->pluck('name')->all())->toBe(['Large', 'Charm']);

    $file = $order->files()->sole();
    expect($file->kind)->toBe(OrderFileKind::Photo);
    Storage::disk('local')->assertExists($file->path);
});

test('a Taptale-designed order adds the design fee and needs a design proof', function () {
    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'design_mode' => DesignMode::TaptaleDesigned->value,
        'option_ids' => [$this->small->id],
        'quantity' => 1,
        'personalization' => ['design_brief' => 'Soft pastel florals with our names.'],
        'approve_preview' => false,
    ]))->assertSessionHasNoErrors();

    $order = Order::sole();

    expect($order)
        ->customization_fee->toBe(5000)
        ->total->toBe(15000 + 5000 + 15000)
        ->preview_approved_at->toBeNull()
        ->and($order->isDesignApproved())->toBeFalse();
});

test('a Taptale-designed order requires a design brief', function () {
    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'design_mode' => DesignMode::TaptaleDesigned->value,
        'personalization' => ['names' => 'Ana', 'design_brief' => ''],
    ]))->assertSessionHasErrors(['personalization.design_brief' => 'Please describe the design you would like us to create.']);

    expect(Order::count())->toBe(0);
});

test('a self-customized order requires the preview to be approved', function () {
    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'approve_preview' => false,
    ]))->assertSessionHasErrors(['approve_preview' => 'Please approve your design preview before placing the order.']);
});

test('every single-choice option group must be answered', function () {
    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'option_ids' => [$this->charm->id],
    ]))->assertSessionHasErrors(['option_ids' => 'Please choose a size.']);
});

test('only one option per single-choice group may be chosen', function () {
    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'option_ids' => [$this->small->id, $this->large->id],
    ]))->assertSessionHasErrors(['option_ids' => 'Please choose only one size.']);
});

test('options belonging to another product are rejected', function () {
    $foreign = ProductOption::factory()->group(OptionGroup::Size)->create();

    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'option_ids' => [$foreign->id],
    ]))->assertSessionHasErrors('option_ids');

    expect(Order::count())->toBe(0);
});

test('the product must belong to the chosen category', function () {
    $otherCategory = Category::factory()->create();

    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'category_id' => $otherCategory->id,
    ]))->assertSessionHasErrors(['product_id' => 'This product is not available in the selected category.']);
});

test('the quantity respects the product minimum', function () {
    $this->product->update(['min_quantity' => 20]);

    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'quantity' => 5,
    ]))->assertSessionHasErrors('quantity');
});

test('the number of photos is limited per product', function () {
    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'photos' => [
            UploadedFile::fake()->image('1.jpg'),
            UploadedFile::fake()->image('2.jpg'),
            UploadedFile::fake()->image('3.jpg'),
        ],
    ]))->assertSessionHasErrors(['photos' => 'You can upload up to 2 photos for this product.']);
});

test('choosing an NFC option creates a digital experience for the order', function () {
    $nfc = ProductOption::factory()->for($this->product)->group(OptionGroup::Nfc)->costing(15000)->create([
        'enables_digital_experience' => true,
    ]);

    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'option_ids' => [$this->small->id, $nfc->id],
    ]))->assertSessionHasNoErrors()->assertRedirect();

    $experience = Order::sole()->experience;

    expect($experience)->not->toBeNull()
        ->and($experience->user_id)->toBe($this->customer->id)
        ->and($experience->title)->toBe('Ana & Leo')
        ->and($experience->is_published)->toBeFalse();
});

test('orders without NFC do not get a digital experience', function () {
    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this))->assertSessionHasNoErrors();

    expect(Order::sole()->experience)->toBeNull();
});

test('personalization can be skipped and added after ordering', function () {
    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'design_mode' => DesignMode::SelfCustomized->value,
        'personalize_later' => true,
        'personalization' => [],
        'approve_preview' => false,
    ]))->assertSessionHasNoErrors();

    $order = Order::sole();

    expect($order->preview_approved_at)->toBeNull()
        ->and($order->isDesignApproved())->toBeFalse()
        ->and($order->customization_fee)->toBe(0)
        ->and($order->activities()->sole()->body)->toContain('Finish your design from this page');
});

test('without skipping, a self-designed order still needs names and approval', function () {
    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'personalize_later' => false,
        'personalization' => [],
        'approve_preview' => false,
    ]))->assertSessionHasErrors(['personalization.names', 'approve_preview']);
});

test('the chosen website design becomes the memory page design', function () {
    $nfc = ProductOption::factory()->for($this->product)->group(OptionGroup::Nfc)->costing(15000)->create([
        'enables_digital_experience' => true,
    ]);

    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'option_ids' => [$this->small->id, $nfc->id],
        'experience_template' => 'our_song',
    ]))->assertSessionHasNoErrors();

    $experience = Order::sole()->experience;

    expect($experience->template->value)->toBe('our_song')
        ->and($experience->theme)->toBe('midnight');
});

test('photos added while ordering also fill the memory page', function () {
    $nfc = ProductOption::factory()->for($this->product)->group(OptionGroup::Nfc)->costing(15000)->create([
        'enables_digital_experience' => true,
    ]);

    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'option_ids' => [$this->small->id, $nfc->id],
        'experience_template' => 'love_story',
        'personalize_later' => true,
        'approve_preview' => false,
        'photos' => [UploadedFile::fake()->image('1.jpg'), UploadedFile::fake()->image('2.jpg')],
    ]))->assertSessionHasNoErrors();

    $experience = Order::sole()->experience;

    expect($experience->photos)->toHaveCount(2);
    Storage::disk('local')->assertExists($experience->photos);
});

test('a page designed on a demo becomes the memory page, photos and all', function () {
    $nfc = ProductOption::factory()->for($this->product)->group(OptionGroup::Nfc)->costing(15000)->create([
        'enables_digital_experience' => true,
    ]);

    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'option_ids' => [$this->small->id, $nfc->id],
        'experience_template' => 'digital_bouquet',
        'personalize_later' => true,
        'approve_preview' => false,
        'photos' => [UploadedFile::fake()->image('keychain.jpg')],
        'page' => [
            'title' => 'Flowers for Mia',
            'recipient_name' => 'Mia',
            'message' => '',
            'flower_style' => 'white',
            'flower_rain' => 'photos',
            'photo_rain_layer' => 'back',
            'video_frame' => 'film',
            'video_background' => 'starry',
            'moments' => [
                ['date' => 'June 2', 'title' => 'Baguio', 'caption' => 'Our first trip', 'photo' => 1],
                ['date' => null, 'title' => 'No photo yet', 'caption' => null, 'photo' => null],
            ],
        ],
        'page_photos' => [UploadedFile::fake()->image('first.jpg'), UploadedFile::fake()->image('second.jpg')],
    ]))->assertSessionHasNoErrors();

    $experience = Order::sole()->experience;

    expect($experience)
        ->template->value->toBe('digital_bouquet')
        ->title->toBe('Flowers for Mia')
        ->recipient_name->toBe('Mia')
        ->message->toBeNull()
        ->flower_style->value->toBe('white')
        ->flower_rain->value->toBe('photos')
        ->photo_rain_layer->value->toBe('back')
        ->video_frame->toBe('film')
        ->video_background->toBe('starry')
        ->photos->toHaveCount(3)
        ->moments->toBe([
            ['date' => 'June 2', 'title' => 'Baguio', 'caption' => 'Our first trip', 'photo' => 1],
            ['date' => null, 'title' => 'No photo yet', 'caption' => null, 'photo' => null],
        ]);
    Storage::disk('local')->assertExists($experience->photos);
});

test('extra sections and raining photos made on a demo come with the order', function () {
    $nfc = ProductOption::factory()->for($this->product)->group(OptionGroup::Nfc)->costing(15000)->create([
        'enables_digital_experience' => true,
    ]);

    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'option_ids' => [$this->small->id, $nfc->id],
        'experience_template' => 'anniversary',
        'page' => [
            'title' => 'Year one',
            'custom_sections' => [[
                'id' => 'abc12345',
                'type' => 'film_strip',
                'position' => 2,
                'title' => 'Our trips',
                'background' => '#AA3355',
                'slots' => [
                    ['photo' => 1, 'caption' => 'Baguio'],
                    ['photo' => null, 'caption' => null],
                ],
            ]],
        ],
        'page_photos' => [UploadedFile::fake()->image('first.jpg'), UploadedFile::fake()->image('second.jpg')],
        'page_rain_photos' => [UploadedFile::fake()->image('rain-1.jpg'), UploadedFile::fake()->image('rain-2.jpg')],
        'page_video' => UploadedFile::fake()->create('us.mp4', 500, 'video/mp4'),
    ]))->assertSessionHasNoErrors();

    $experience = Order::sole()->experience;

    Storage::disk('local')->assertExists($experience->video_path);

    expect($experience->photos)->toHaveCount(2)
        ->and($experience->rain_photos)->toHaveCount(2)
        ->and($experience->custom_sections)->toBe([[
            'id' => 'abc12345',
            'type' => 'film_strip',
            'position' => 2,
            'title' => 'Our trips',
            'text' => null,
            'background' => '#aa3355',
            'slots' => [
                ['photo' => 1, 'caption' => 'Baguio'],
                ['photo' => null, 'caption' => null],
            ],
        ]]);
    Storage::disk('local')->assertExists($experience->rain_photos);
});

test('the photo put in each design frame on a demo comes with the order', function () {
    $nfc = ProductOption::factory()->for($this->product)->group(OptionGroup::Nfc)->costing(15000)->create([
        'enables_digital_experience' => true,
    ]);

    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'option_ids' => [$this->small->id, $nfc->id],
        'experience_template' => 'monthsary',
        'page' => [
            'title' => 'Six months',
            'photo_frames' => [
                'hero_photo' => [1],
                'film_strip' => [null, 0],
                'gallery' => [0],
            ],
        ],
        'page_photos' => [UploadedFile::fake()->image('first.jpg'), UploadedFile::fake()->image('second.jpg')],
    ]))->assertSessionHasNoErrors();

    expect(Order::sole()->experience->photo_frames)->toBe([
        'hero_photo' => [1],
        'film_strip' => [null, 0],
    ]);
});

test('the spot chosen for the flowers on a demo is kept only with the paid add-on', function (bool $flowerAddon, int $expectedSections) {
    $nfc = ProductOption::factory()->for($this->product)->group(OptionGroup::Nfc)->costing(15000)->create([
        'enables_digital_experience' => true,
    ]);
    $flowersSection = ['id' => 'flow1234', 'type' => 'flowers', 'position' => 3, 'slots' => []];
    $noteSection = ['id' => 'note1234', 'type' => 'note', 'position' => 1, 'title' => 'Hi', 'slots' => []];

    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'option_ids' => [$this->small->id, $nfc->id],
        'experience_template' => 'anniversary',
        'flower_addon' => $flowerAddon,
        'page' => [
            'title' => 'Year one',
            'custom_sections' => [$noteSection, $flowersSection, [...$flowersSection, 'id' => 'flow5678']],
        ],
    ]))->assertSessionHasNoErrors();

    $experience = Order::sole()->experience;

    expect($experience->custom_sections)->toHaveCount($expectedSections)
        ->and($experience->flower_addon)->toBe($flowerAddon)
        ->and(collect($experience->custom_sections)->where('type', 'flowers')->count())->toBe($flowerAddon ? 1 : 0);
})->with([
    'flowers bought' => [true, 2],
    'flowers not bought' => [false, 1],
]);

test('extra sections on a designed page must be valid', function () {
    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'page' => [
            'custom_sections' => [
                ['id' => 'Not An Id!', 'type' => 'carousel', 'position' => 1, 'background' => 'red'],
            ],
        ],
    ]))->assertSessionHasErrors([
        'page.custom_sections.0.id',
        'page.custom_sections.0.type',
        'page.custom_sections.0.background',
    ]);

    expect(Order::count())->toBe(0);
});

test('a designed page with a blank headline uses the names on the gift', function () {
    $nfc = ProductOption::factory()->for($this->product)->group(OptionGroup::Nfc)->costing(15000)->create([
        'enables_digital_experience' => true,
    ]);

    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'option_ids' => [$this->small->id, $nfc->id],
        'experience_template' => 'digital_bouquet',
        'page' => ['title' => '', 'flower_style' => 'pink'],
    ]))->assertSessionHasNoErrors();

    expect(Order::sole()->experience)
        ->title->toBe('Ana & Leo')
        ->flower_style->value->toBe('pink');
});

test('a designed page only accepts known flowers, rain and safe song links', function () {
    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'page' => ['flower_style' => 'cactus', 'flower_rain' => 'snow', 'music_url' => 'javascript:alert(1)'],
    ]))->assertSessionHasErrors(['page.flower_style', 'page.flower_rain', 'page.music_url']);

    expect(Order::count())->toBe(0);
});

test('a demo page opens the wizard with that design', function () {
    $this->get(route('orders.create', ['product' => $this->product->slug, 'page' => 'digital_bouquet']))
        ->assertInertia(fn ($page) => $page->where('initialPage', 'digital_bouquet'));

    $this->get(route('orders.create', ['product' => $this->product->slug, 'page' => 'moonlight_garden']))
        ->assertInertia(fn ($page) => $page->where('initialPage', null));
});

test('flowers can be added to a page design without them for a fee', function () {
    config(['taptale.flowers_addon_price' => 500]);
    $nfc = ProductOption::factory()->for($this->product)->group(OptionGroup::Nfc)->costing(15000)->create([
        'enables_digital_experience' => true,
    ]);

    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'option_ids' => [$this->small->id, $nfc->id],
        'quantity' => 2,
        'experience_template' => 'anniversary',
        'flower_addon' => true,
    ]))->assertSessionHasNoErrors();

    $order = Order::sole();

    expect($order)
        ->subtotal->toBe(60000)
        ->flowers_fee->toBe(500)
        ->total->toBe(60000 + 500 + 15000)
        ->and($order->experience->flower_addon)->toBeTrue()
        ->and($order->experience->showsFlowers())->toBeTrue();
});

test('the bouquet design includes its flowers at no extra cost', function () {
    config(['taptale.flowers_addon_price' => 500]);
    $nfc = ProductOption::factory()->for($this->product)->group(OptionGroup::Nfc)->costing(15000)->create([
        'enables_digital_experience' => true,
    ]);

    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'option_ids' => [$this->small->id, $nfc->id],
        'experience_template' => 'digital_bouquet',
        'flower_addon' => true,
    ]))->assertSessionHasNoErrors();

    $order = Order::sole();

    expect($order->flowers_fee)->toBe(0)
        ->and($order->experience->flower_addon)->toBeFalse()
        ->and($order->experience->showsFlowers())->toBeTrue();
});

test('a gift without a memory page is never charged for flowers', function () {
    config(['taptale.flowers_addon_price' => 500]);

    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'experience_template' => 'anniversary',
        'flower_addon' => true,
    ]))->assertSessionHasNoErrors();

    expect(Order::sole())->flowers_fee->toBe(0)->experience->toBeNull();
});

test('promo codes discount the items but never the flowers add-on', function () {
    config(['taptale.flowers_addon_price' => 500]);
    PromoCode::factory()->create(['code' => 'ALLFREE', 'discount_value' => 100]);
    $nfc = ProductOption::factory()->for($this->product)->group(OptionGroup::Nfc)->costing(15000)->create([
        'enables_digital_experience' => true,
    ]);

    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'option_ids' => [$this->small->id, $nfc->id],
        'experience_template' => 'birthday',
        'flower_addon' => true,
        'promo_code' => 'ALLFREE',
    ]))->assertSessionHasNoErrors();

    $order = Order::sole();

    expect($order)
        ->discount->toBe($order->subtotal)
        ->flowers_fee->toBe(500)
        ->total->toBe(500 + 15000);
});

test('choosing a PayMongo method sends the customer straight to secure checkout', function () {
    config(['services.paymongo.secret_key' => 'sk_test_secret']);
    $payMongo = PaymentMethod::factory()->create(['driver' => 'paymongo']);
    Http::preventStrayRequests();
    Http::fake(['https://api.paymongo.com/v1/checkout_sessions' => Http::response([
        'data' => ['id' => 'cs_new', 'attributes' => ['checkout_url' => 'https://checkout.paymongo.com/cs_new']],
    ])]);

    $this->actingAs($this->customer)
        ->post(route('orders.store'), orderPayload($this, ['payment_method_id' => $payMongo->id]))
        ->assertRedirect('https://checkout.paymongo.com/cs_new');

    expect(Order::sole()->payments()->sole()->gateway_checkout_id)->toBe('cs_new');
});

test('choosing a Taptale QR method shows the QR payment page after ordering', function () {
    config(['services.paymongo.secret_key' => 'sk_test_secret']);
    $qrMethod = PaymentMethod::factory()->create(['driver' => 'paymongo_qrph']);
    Http::preventStrayRequests();
    Http::fake([
        'https://api.paymongo.com/v1/payment_intents' => Http::response(['data' => ['id' => 'pi_new', 'attributes' => ['client_key' => 'pi_new_key']]]),
        'https://api.paymongo.com/v1/payment_methods' => Http::response(['data' => ['id' => 'pm_qr']]),
        'https://api.paymongo.com/v1/payment_intents/pi_new/attach' => Http::response(['data' => ['id' => 'pi_new', 'attributes' => [
            'next_action' => ['code' => ['image_url' => 'data:image/png;base64,iVBORw0KGgo=']],
        ]]]),
    ]);

    $this->actingAs($this->customer)
        ->post(route('orders.store'), orderPayload($this, ['payment_method_id' => $qrMethod->id]))
        ->assertRedirect(route('account.orders.qrph.show', Order::sole()));
});

test('choosing cash on delivery starts the design without waiting for payment', function () {
    Notification::fake();
    $admin = User::factory()->admin()->create();
    $cashOnDelivery = PaymentMethod::factory()->create(['driver' => 'cod']);

    $this->actingAs($this->customer)
        ->post(route('orders.store'), orderPayload($this, ['payment_method_id' => $cashOnDelivery->id]))
        ->assertRedirect(route('account.orders.show', Order::sole()));

    $order = Order::sole()->load('payments');

    expect($order->status)->toBe(OrderStatus::DesignApproved)
        ->and($order->balanceDue())->toBe($order->total);

    Notification::assertSentTo($admin, AdminOrderAlert::class, fn (AdminOrderAlert $alert) => $alert->order->is($order)
        && $alert->toMail($admin)->subject === "New cash on delivery order {$order->reference}");
});

test('an unknown website design is rejected', function () {
    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'experience_template' => 'mystery',
    ]))->assertSessionHasErrors('experience_template');
});

test('a promo code takes its discount off the items subtotal and counts one use', function () {
    $promoCode = PromoCode::factory()->create(['code' => 'LOVE10', 'discount_value' => 10]);

    $this->actingAs($this->customer)
        ->post(route('orders.store'), orderPayload($this, ['promo_code' => ' love10 ']))
        ->assertSessionHasNoErrors();

    expect(Order::sole())
        ->subtotal->toBe(44000)
        ->discount->toBe(4400)
        ->promo_code->toBe('LOVE10')
        ->promo_code_id->toBe($promoCode->id)
        ->total->toBe(44000 - 4400 + 15000)
        ->and($promoCode->fresh()->uses)->toBe(1);
});

test('a fixed promo code never discounts more than the items', function () {
    PromoCode::factory()->fixed(1_000_000)->create(['code' => 'BIG']);

    $this->actingAs($this->customer)
        ->post(route('orders.store'), orderPayload($this, ['promo_code' => 'BIG']))
        ->assertSessionHasNoErrors();

    expect(Order::sole())
        ->discount->toBe(44000)
        ->total->toBe(15000);
});

test('promo codes that cannot be used are rejected without placing the order', function (array $state, string $message) {
    PromoCode::factory()->create(['code' => 'NOPE', ...$state]);

    $this->actingAs($this->customer)
        ->post(route('orders.store'), orderPayload($this, ['promo_code' => 'NOPE']))
        ->assertSessionHasErrors(['promo_code' => $message]);

    expect(Order::count())->toBe(0);
})->with([
    'inactive' => [['is_active' => false], 'This promo code is not active.'],
    'expired' => [['ends_at' => now()->subDay()], 'This promo code is not active.'],
    'not started' => [['starts_at' => now()->addDay()], 'This promo code is not active.'],
    'below minimum' => [['min_subtotal' => 50000], 'This promo code needs a subtotal of at least ₱500.00.'],
]);

test('a code whose uses are all taken by paid and recent unpaid orders is fully used', function () {
    $promoCode = PromoCode::factory()->create(['code' => 'FIRST2', 'max_uses' => 2]);
    Order::factory()->for($promoCode)->status(OrderStatus::InProduction)->create(['customer_phone' => '0918 000 0001']);
    Order::factory()->for($promoCode)->status(OrderStatus::AwaitingPayment)->create(['customer_phone' => '0918 000 0002', 'created_at' => now()->subHours(2)]);

    $this->actingAs($this->customer)
        ->post(route('orders.store'), orderPayload($this, ['promo_code' => 'FIRST2']))
        ->assertSessionHasErrors(['promo_code' => 'This promo code has been fully used.']);
});

test('an unpaid order stops holding its promo use after the hold window', function () {
    $promoCode = PromoCode::factory()->create(['code' => 'FIRST1', 'max_uses' => 1]);
    Order::factory()->for($promoCode)->status(OrderStatus::AwaitingPayment)->create([
        'customer_phone' => '0918 000 0001',
        'created_at' => now()->subHours((int) config('taptale.promo_hold_hours') + 1),
    ]);

    $this->actingAs($this->customer)
        ->post(route('orders.store'), orderPayload($this, ['promo_code' => 'FIRST1']))
        ->assertSessionHasNoErrors();

    expect($promoCode->heldUses())->toBe(1);
});

test('a one-use promo cannot be used again with the same phone number in another format', function () {
    $promoCode = PromoCode::factory()->create(['code' => 'ONCE']);
    Order::factory()->for($promoCode)->status(OrderStatus::InProduction)->create(['customer_phone' => '+63 917 123 4567']);

    $this->actingAs($this->customer)
        ->post(route('orders.store'), orderPayload($this, ['promo_code' => 'ONCE', 'customer_phone' => '0917-123-4567']))
        ->assertSessionHasErrors(['promo_code' => 'This promo code has already been used with this phone number.']);
});

test('a customer can place only a few orders a day, cancelled ones included', function () {
    config(['taptale.max_orders_per_day' => 2, 'taptale.max_unpaid_orders' => 5]);
    Order::factory()->for($this->customer)->status(OrderStatus::Cancelled)->create();
    Order::factory()->for($this->customer)->status(OrderStatus::Cancelled)->create(['created_at' => now()->subHours(23)]);
    Order::factory()->for($this->customer)->status(OrderStatus::Completed)->create(['created_at' => now()->subDays(2)]);

    $this->actingAs($this->customer)
        ->post(route('orders.store'), orderPayload($this))
        ->assertSessionHasErrors(['order' => 'You have placed 2 orders in the last 24 hours. Please try again tomorrow, or contact us if you need a bigger order.']);
});

test('a customer with too many unpaid orders is asked to pay or cancel one first', function () {
    config(['taptale.max_unpaid_orders' => 2]);
    Order::factory()->count(2)->for($this->customer)->status(OrderStatus::AwaitingPayment)->create();
    Order::factory()->for($this->customer)->status(OrderStatus::Completed)->create();

    $this->actingAs($this->customer)
        ->post(route('orders.store'), orderPayload($this))
        ->assertSessionHasErrors(['order' => 'You have 2 orders waiting for payment. Please pay for or cancel one of them before placing another.']);
});

test('an unknown promo code is rejected', function () {
    $this->actingAs($this->customer)
        ->post(route('orders.store'), orderPayload($this, ['promo_code' => 'MADEUP']))
        ->assertSessionHasErrors(['promo_code' => 'This promo code does not exist.']);
});

test('only signed-in customers can try promo codes', function () {
    PromoCode::factory()->create(['code' => 'LOVE10']);

    $this->getJson(route('promo-codes.check', ['code' => 'love10', 'subtotal' => 44000]))->assertUnauthorized();
});

test('the wizard checks a promo code before the order is placed', function () {
    PromoCode::factory()->create(['code' => 'LOVE10', 'discount_value' => 10, 'min_subtotal' => 30000]);
    $this->actingAs($this->customer);

    $this->getJson(route('promo-codes.check', ['code' => 'love10', 'subtotal' => 44000]))
        ->assertOk()
        ->assertJson(['code' => 'LOVE10', 'discount_type' => 'percent', 'discount_value' => 10, 'min_subtotal' => 30000]);

    $this->getJson(route('promo-codes.check', ['code' => 'love10', 'subtotal' => 1000]))
        ->assertJsonValidationErrors(['code' => 'This promo code needs a subtotal of at least ₱300.00.']);
});

test('a gift order keeps its gift message for the packing slip', function () {
    $this->actingAs($this->customer)
        ->post(route('orders.store'), orderPayload($this, ['is_gift' => true, 'gift_message' => '  Happy anniversary!  ']))
        ->assertSessionHasNoErrors();

    expect(Order::sole())
        ->is_gift->toBeTrue()
        ->gift_message->toBe('Happy anniversary!');
});

test('a gift message is dropped when the order is not a gift', function () {
    $this->actingAs($this->customer)
        ->post(route('orders.store'), orderPayload($this, ['is_gift' => false, 'gift_message' => 'Hi']))
        ->assertSessionHasNoErrors();

    expect(Order::sole())
        ->is_gift->toBeFalse()
        ->gift_message->toBeNull();
});
