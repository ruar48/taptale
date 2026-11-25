<?php

/*
|--------------------------------------------------------------------------
| NFC tag journey, end to end
|--------------------------------------------------------------------------
|
| A keychain from checkout to a live memory page: the customer orders and
| publishes the page, the studio copies the tag link from the order, writes
| it onto the tag in NXP TagWriter with the UID + counter mirror turned on,
| and the first tap activates the tag. The chip itself cannot be written
| from a test, so a tap is the tag link with the mirror filled in, which is
| exactly what the phone opens.
|
*/

use App\Enums\DesignMode;
use App\Enums\OptionGroup;
use App\Models\Category;
use App\Models\DigitalExperience;
use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\ProductOption;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake('local');
});

/**
 * Check out a keychain, which always comes with a memory page.
 */
function checkOutKeychainWithPage(User $customer): Order
{
    $category = Category::factory()->create();
    $keychain = Product::factory()->withDigitalExperience()->create(['name' => 'Photo Keychain', 'min_quantity' => 1]);
    $category->products()->attach($keychain);
    $size = ProductOption::factory()->for($keychain)->group(OptionGroup::Size)->create();

    test()->actingAs($customer)->post(route('orders.store'), [
        'category_id' => $category->id,
        'product_id' => $keychain->id,
        'design_mode' => DesignMode::SelfCustomized->value,
        'option_ids' => [$size->id],
        'quantity' => 1,
        'personalization' => ['names' => 'Ana & Leo'],
        'approve_preview' => true,
        'customer_name' => 'Ana Cruz',
        'customer_email' => 'ana@example.com',
        'customer_phone' => '0917 123 4567',
        'address_line' => '12 Sampaguita St.',
        'city' => 'Binalonan',
        'province' => 'Pangasinan',
        'postal_code' => '2436',
        'payment_method_id' => PaymentMethod::factory()->create()->id,
    ])->assertSessionHasNoErrors();

    return Order::sole();
}

/**
 * The address a phone opens when it taps a tag written with the given link:
 * the chip overwrites the mirror placeholder with its ID and tap count.
 */
function tapWrittenTag(string $tagLink, string $mirror): string
{
    return str_replace('00000000000000x000000', $mirror, $tagLink);
}

/**
 * Sign out and forget the session, like picking up a different phone.
 */
function switchToAnotherPhone(): void
{
    auth()->logout();
    test()->flushSession();
}

test('a keychain order ends with a published page that only its genuine tag opens', function () {
    $admin = User::factory()->admin()->create();
    $customer = User::factory()->create();
    $order = checkOutKeychainWithPage($customer);
    $experience = $order->experience;

    $this->actingAs($customer)
        ->put(route('account.experiences.update', $experience), [
            'template' => $experience->template->value,
            'theme' => $experience->theme,
            'title' => 'Ana & Leo',
            'message' => 'Happy anniversary, love.',
            'is_published' => true,
        ])
        ->assertSessionHasNoErrors();

    $tagLink = $this->actingAs($admin)
        ->get(route('admin.orders.show', $order))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('order.experience.is_published', true)
            ->where('order.experience.is_tag_check_active', false))
        ->inertiaProps('order.experience.tag_url');

    expect($tagLink)->toBe(url("t/{$experience->code}?k={$experience->access_key}&m=00000000000000x000000"));

    switchToAnotherPhone();

    $this->get(tapWrittenTag($tagLink, '04A1B2C3D4E5F6x000001'))
        ->assertRedirect(route('experiences.show', $experience));

    $this->get(route('experiences.show', $experience))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('storefront/experience')
            ->where('experience.title', 'Ana & Leo')
            ->where('isRecipient', true));

    expect($experience->fresh())
        ->nfc_tag_uid->toBe('04:A1:B2:C3:D4:E5:F6')
        ->nfc_tap_counter->toBe(1);

    $this->actingAs($admin)
        ->get(route('admin.orders.show', $order))
        ->assertInertia(fn (Assert $page) => $page->where('order.experience.is_tag_check_active', true));

    switchToAnotherPhone();

    $this->get(route('experiences.show', $experience))->assertNotFound();
    $this->get(tapWrittenTag($tagLink, '04A1B2C3D4E5F6x000001'))->assertNotFound();
    $this->get(tapWrittenTag($tagLink, '04A1B2C3D4E5F6x000002'))
        ->assertRedirect(route('experiences.show', $experience));
});

test('a tap before the page is published opens nothing and does not use up the tag', function () {
    $experience = DigitalExperience::factory()->unpublished()->create();

    tapTag($experience, '04A1B2C3D4E5F6x000001')->assertNotFound();

    expect($experience->fresh())
        ->nfc_tag_uid->toBeNull()
        ->nfc_tap_counter->toBeNull();

    $experience->update(['is_published' => true]);

    tapTag($experience, '04A1B2C3D4E5F6x000002')->assertRedirect(route('experiences.show', $experience));
});

test('the studio activates the tag from a signed-in phone before the page is published', function () {
    $admin = User::factory()->admin()->create();
    $experience = DigitalExperience::factory()->unpublished()->create(['view_count' => 0]);

    $this->actingAs($admin);
    tapTag($experience, '04A1B2C3D4E5F6x000001')->assertRedirect(route('experiences.show', $experience));

    expect($experience->fresh())
        ->nfc_tag_uid->toBe('04:A1:B2:C3:D4:E5:F6')
        ->nfc_tap_counter->toBe(1)
        ->view_count->toBe(0);
});
