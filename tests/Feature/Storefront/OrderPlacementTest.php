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
use App\Models\Template;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
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

    $this->template = Template::factory()->create();
    $this->template->categories()->attach($this->category);

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
        'template_id' => $test->template->id,
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

test('guests must sign in before personalizing a gift', function () {
    $this->get(route('orders.create'))->assertRedirect(route('login'));
    $this->post(route('orders.store'), [])->assertRedirect(route('login'));
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
        'template_id' => null,
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

test('the template must be available for the category', function () {
    $unrelated = Template::factory()->create();

    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'template_id' => $unrelated->id,
    ]))->assertSessionHasErrors(['template_id' => 'This template is not available for the selected product.']);
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
        ->and($order->activities()->sole()->body)->toContain('Add your photos and details');
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

test('an unknown website design is rejected', function () {
    $this->actingAs($this->customer)->post(route('orders.store'), orderPayload($this, [
        'experience_template' => 'mystery',
    ]))->assertSessionHasErrors('experience_template');
});
