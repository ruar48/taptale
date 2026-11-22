<?php

/*
|--------------------------------------------------------------------------
| Customer personas
|--------------------------------------------------------------------------
|
| Ten imaginary customers using the memory pages, promo codes, gifts,
| reviews and emails. Five are not technical and trip over things by
| accident; five are technical and try to break or abuse the system.
|
*/

use App\Enums\ActivityType;
use App\Enums\DesignMode;
use App\Enums\OptionGroup;
use App\Enums\OrderStatus;
use App\Http\Controllers\Storefront\ExperienceReactionController;
use App\Models\Category;
use App\Models\DigitalExperience;
use App\Models\Order;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\ProductOption;
use App\Models\PromoCode;
use App\Models\Template;
use App\Models\User;
use App\Notifications\AdminOrderAlert;
use App\Notifications\MemoryPageReplied;
use App\Notifications\OrderUpdated;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake('local');
});

/**
 * A ready-to-order product, so the shoppers below can check out.
 *
 * @return array<string, mixed>
 */
function personaCheckout(array $overrides = []): array
{
    $category = Category::factory()->create();
    $product = Product::factory()->create(['base_price' => 50000, 'design_fee' => 0, 'min_quantity' => 1]);
    $category->products()->attach($product);
    $size = ProductOption::factory()->for($product)->group(OptionGroup::Size)->create();
    $template = Template::factory()->create();
    $template->categories()->attach($category);

    return array_replace([
        'category_id' => $category->id,
        'product_id' => $product->id,
        'template_id' => $template->id,
        'design_mode' => DesignMode::SelfCustomized->value,
        'option_ids' => [$size->id],
        'quantity' => 1,
        'personalization' => ['names' => 'Ana & Leo'],
        'approve_preview' => true,
        'customer_name' => 'Juan Dela Cruz',
        'customer_email' => 'juan@example.com',
        'customer_phone' => '0917 123 4567',
        'address_line' => '12 Sampaguita St.',
        'city' => 'Quezon City',
        'province' => 'Metro Manila',
        'postal_code' => '1100',
        'payment_method_id' => PaymentMethod::factory()->create()->id,
    ], $overrides);
}

/*
|--------------------------------------------------------------------------
| Non-technical customers
|--------------------------------------------------------------------------
*/

describe('Tita Baby, the recipient who shares everything on Messenger', function () {
    test('her tap opens the page, but the link she forwards opens nothing for her cousin', function () {
        $experience = DigitalExperience::factory()->create();

        tapTag($experience)->assertRedirect(route('experiences.show', $experience));
        $this->get(route('experiences.show', $experience))->assertOk();

        $this->flushSession();
        $this->get(route('experiences.show', $experience))->assertNotFound();
    });

    test('she comes back to the open tab hours later and the page still opens on her phone', function () {
        $experience = DigitalExperience::factory()->create();
        $remembered = tapTag($experience)->getCookie('taptale_pages');

        expect($remembered)->not->toBeNull();

        $this->flushSession();
        $this->travel(5)->hours();

        $this->withCookie('taptale_pages', $remembered->getValue())
            ->get(route('experiences.show', $experience))
            ->assertOk();
    });

    test('she presses the heart again and again, and it counts once', function () {
        $experience = DigitalExperience::factory()->create();
        tapTag($experience);

        foreach (range(1, 8) as $press) {
            $this->post(route('experiences.heart', $experience));
        }

        expect($experience->fresh()->heart_count)->toBe(1);
    });

    test('her reply full of emoji arrives intact', function () {
        Notification::fake();
        $experience = DigitalExperience::factory()->create();
        tapTag($experience);

        $this->post(route('experiences.replies.store', $experience), ['message' => 'Salamat anak!!! 😭💖🎂'])
            ->assertSessionHasNoErrors();

        expect($experience->replies()->sole()->message)->toBe('Salamat anak!!! 😭💖🎂');
    });
});

describe('Kuya Jun, the gift buyer who changes his mind at checkout', function () {
    test('his promo stops qualifying after he lowers the quantity, and he is told why', function () {
        $checkout = personaCheckout(['quantity' => 3]);
        $promoCode = PromoCode::factory()->create(['code' => 'BIG3', 'min_subtotal' => 100000]);

        $this->actingAs(User::factory()->create())
            ->post(route('orders.store'), [...$checkout, 'quantity' => 1, 'promo_code' => 'BIG3'])
            ->assertSessionHasErrors(['promo_code' => 'This promo code needs a subtotal of at least ₱1,000.00.']);

        expect(Order::count())->toBe(0)
            ->and($promoCode->fresh()->uses)->toBe(0);
    });

    test('he pastes the code with spaces and lowercase and it still works', function () {
        PromoCode::factory()->create(['code' => 'PASKO', 'discount_value' => 10]);

        $this->actingAs(User::factory()->create())
            ->post(route('orders.store'), personaCheckout(['promo_code' => "  pasko \n"]))
            ->assertSessionHasNoErrors();

        expect(Order::sole()->discount)->toBe(5000);
    });
});

describe('Lola Nena, the recipient who opens the surprise too early', function () {
    test('she leaves the countdown open overnight and the page opens when the time comes', function () {
        $experience = DigitalExperience::factory()->create(['unlocks_at' => now()->addHours(10)]);
        $remembered = tapTag($experience)->getCookie('taptale_pages');

        $this->get(route('experiences.show', $experience))
            ->assertInertia(fn (Assert $page) => $page->component('storefront/experience-locked'));

        $this->flushSession();
        $this->travel(11)->hours();

        $this->withCookie('taptale_pages', $remembered->getValue())
            ->get(route('experiences.show', $experience))
            ->assertInertia(fn (Assert $page) => $page->component('storefront/experience'));
    });
});

describe('Ate Joy, the owner who uploads whatever is in her gallery', function () {
    test('a broken photo gives her a clear error instead of a fake "Photo added"', function () {
        $experience = DigitalExperience::factory()->create(['photos' => []]);
        $broken = UploadedFile::fake()->createWithContent('IMG_2041.jpg', "\xFF\xD8\xFF\xE0 this is not really a picture");

        $this->actingAs($experience->user)
            ->post(route('account.experiences.photos.store', $experience), ['photos' => [$broken]])
            ->assertSessionHasErrors('photos');

        expect($experience->fresh()->photos)->toBe([]);
    });

    test('a broken photo in the editor does not delete the photos she chose to remove', function () {
        Storage::disk('local')->put('experiences/1/keep.jpg', 'image');
        $experience = DigitalExperience::factory()->create(['photos' => ['experiences/1/keep.jpg']]);
        $broken = UploadedFile::fake()->createWithContent('IMG_2042.jpg', "\xFF\xD8\xFF\xE0 broken");

        $this->actingAs($experience->user)
            ->put(route('account.experiences.update', $experience), [
                'template' => 'classic',
                'title' => 'Us',
                'theme' => 'blush',
                'remove_photos' => [0],
                'new_photos' => [$broken],
            ])
            ->assertSessionHasErrors('new_photos');

        Storage::disk('local')->assertExists('experiences/1/keep.jpg');
        expect($experience->fresh()->photos)->toBe(['experiences/1/keep.jpg']);
    });

    test('she sets the opening date in the past by mistake and the page simply opens', function () {
        $experience = DigitalExperience::factory()->create(['unlocks_at' => now()->subDay()]);
        tapTag($experience);

        $this->get(route('experiences.show', $experience))
            ->assertInertia(fn (Assert $page) => $page->component('storefront/experience'));
    });
});

describe('Mang Ruben, the customer who types reviews in a hurry', function () {
    test('"ok" with no name is sent back with friendly errors', function () {
        $order = Order::factory()->status(OrderStatus::Completed)->create();

        $this->actingAs($order->user)
            ->post(route('account.orders.review.store', $order), ['rating' => 1, 'quote' => 'ok', 'author_name' => ''])
            ->assertSessionHasErrors([
                'quote' => 'Please write at least a sentence.',
                'author_name' => 'The display name field is required.',
            ]);
    });

    test('his angry one-star review is saved but waits for approval', function () {
        $order = Order::factory()->status(OrderStatus::Completed)->create();

        $this->actingAs($order->user)
            ->post(route('account.orders.review.store', $order), ['rating' => 1, 'quote' => 'LATE DELIVERY!!! NOT HAPPY', 'author_name' => 'Ruben'])
            ->assertSessionHasNoErrors();

        expect($order->review()->sole()->is_published)->toBeFalse();
    });
});

/*
|--------------------------------------------------------------------------
| Technical customers trying to break things
|--------------------------------------------------------------------------
*/

describe('Key guesser, trying to open pages without the tag', function () {
    test('odd key values are a plain 404, never a server error', function (mixed $key) {
        $experience = DigitalExperience::factory()->create();

        $this->get(route('experiences.show', ['experience' => $experience, 'k' => $key]))->assertNotFound();
    })->with([
        'array' => [['x']],
        'empty' => [''],
        'random' => ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
    ]);

    test('the real key with its letters flipped to the other case opens nothing', function () {
        $experience = DigitalExperience::factory()->create();

        $this->get(route('experiences.show', ['experience' => $experience, 'k' => strrev($experience->access_key)]))->assertNotFound();
        $this->get(route('experiences.show', ['experience' => $experience, 'k' => swapCase($experience->access_key)]))->assertNotFound();
    });

    test('a forged or tampered device cookie opens nothing', function () {
        $experience = DigitalExperience::factory()->create();

        $this->withUnencryptedCookie('taptale_pages', (string) $experience->id)
            ->get(route('experiences.show', $experience))
            ->assertNotFound();

        $this->withUnencryptedCookies(['taptale_pages' => ['a' => (string) $experience->id]])
            ->get(route('experiences.show', $experience))
            ->assertNotFound();
    });

    test('the real key does not open an unpublished page for a stranger', function () {
        $experience = DigitalExperience::factory()->unpublished()->create();

        tapTag($experience)->assertNotFound();
    });

    test('guessing keys in a loop is rate limited', function () {
        $experience = DigitalExperience::factory()->create();

        foreach (range(1, 60) as $guess) {
            $this->get(route('experiences.show', ['experience' => $experience, 'k' => "guess-{$guess}"]));
        }

        $this->get(route('experiences.show', ['experience' => $experience, 'k' => 'one-more']))->assertTooManyRequests();
    });
});

describe('Promo abuser, trying to drain or bend discounts', function () {
    test('placing orders with a limited code from two accounts and cancelling them gives the uses back', function () {
        $accounts = User::factory()->count(2)->create();
        $checkout = personaCheckout();
        $promoCode = PromoCode::factory()->create(['code' => 'FIRST2', 'max_uses' => 2]);

        foreach ($accounts as $account) {
            $this->actingAs($account)->post(route('orders.store'), [...$checkout, 'promo_code' => 'FIRST2'])->assertSessionHasNoErrors();
        }

        expect(Order::count())->toBe(2)
            ->and($promoCode->fresh()->heldUses())->toBe(2);

        foreach (Order::with('user')->get() as $order) {
            $this->actingAs($order->user)->post(route('account.orders.cancel', $order))->assertSessionHasNoErrors();
        }

        expect($promoCode->fresh())
            ->uses->toBe(0)
            ->heldUses()->toBe(0);
    });

    test('one account cannot use the same code twice', function () {
        $customer = User::factory()->create();
        $checkout = personaCheckout();
        PromoCode::factory()->create(['code' => 'ONCE']);

        $this->actingAs($customer)->post(route('orders.store'), [...$checkout, 'promo_code' => 'ONCE', 'customer_notes' => 'First'])->assertSessionHasNoErrors();
        $this->actingAs($customer)->post(route('orders.store'), [...$checkout, 'promo_code' => 'ONCE', 'customer_notes' => 'Second'])
            ->assertSessionHasErrors(['promo_code' => 'You have already used this promo code.']);
    });

    test('sending his own discount and total is ignored', function () {
        $this->actingAs(User::factory()->create())
            ->post(route('orders.store'), personaCheckout(['discount' => 50000, 'total' => 1, 'promo_code_id' => 1]))
            ->assertSessionHasNoErrors();

        expect(Order::sole())
            ->discount->toBe(0)
            ->promo_code_id->toBeNull()
            ->total->toBeGreaterThan(50000);
    });

    test('SQL in the promo box is just an unknown code', function () {
        PromoCode::factory()->create(['code' => 'REAL']);

        $this->actingAs(User::factory()->create())
            ->post(route('orders.store'), personaCheckout(['promo_code' => "' OR 1=1 --"]))
            ->assertSessionHasErrors(['promo_code' => 'This promo code does not exist.']);
    });

    test('poking the promo checker with junk gets validation errors, not crashes', function (array $query) {
        $this->getJson(route('promo-codes.check', $query))->assertUnprocessable();
    })->with([
        'array code' => [['code' => ['A', 'B'], 'subtotal' => 100]],
        'negative subtotal' => [['code' => 'X', 'subtotal' => -5]],
        'huge subtotal' => [['code' => 'X', 'subtotal' => '999999999999999999999999']],
    ]);
});

describe('Injector, hiding links and scripts in text', function () {
    test('a disguised link in a reply is not clickable in the owner\'s email', function () {
        Notification::fake();
        $experience = DigitalExperience::factory()->create();
        tapTag($experience);

        $this->post(route('experiences.replies.store', $experience), [
            'name' => '[Taptale Support](https://evil.test)',
            'message' => 'Your account is locked, [verify here](https://evil.test/login) <script>alert(1)</script>',
        ])->assertSessionHasNoErrors();

        Notification::assertSentTo($experience->user, MemoryPageReplied::class, function (MemoryPageReplied $notification) use ($experience) {
            $html = (string) $notification->toMail($experience->user)->render();

            return ! str_contains($html, 'href="https://evil.test')
                && ! str_contains($html, '<script>alert(1)</script>')
                && str_contains($html, '[verify here](https://evil.test/login)');
        });
    });

    test('a customer name with a link cannot put a fake button in the admin alert', function () {
        Notification::fake();
        $admin = User::factory()->admin()->create();
        $order = Order::factory()->create(['customer_name' => '[Click to verify payment](https://evil.test/admin)']);

        $order->recordActivity(ActivityType::RevisionRequested, 'Please see [the new design](https://evil.test/x)', $order->user);

        Notification::assertSentTo($admin, AdminOrderAlert::class, function (AdminOrderAlert $notification) use ($admin) {
            return ! str_contains((string) $notification->toMail($admin)->render(), 'href="https://evil.test');
        });
    });
});

describe('IDOR hunter, reaching for other people\'s things', function () {
    test('another customer cannot read someone\'s replies and tap stats', function () {
        $experience = DigitalExperience::factory()->create();

        $this->actingAs(User::factory()->create())
            ->get(route('account.experiences.edit', $experience))
            ->assertForbidden();
    });

    test('a customer cannot open packing slips or the admin tools', function () {
        $order = Order::factory()->create();

        $this->actingAs($order->user)->get(route('admin.orders.packing-slip', $order))->assertForbidden();
        $this->actingAs($order->user)->get(route('admin.audit-log'))->assertForbidden();
    });

    test('the owner cannot set their own counters or access key through the editor', function () {
        $experience = DigitalExperience::factory()->create(['heart_count' => 0, 'view_count' => 0]);
        $key = $experience->access_key;

        $this->actingAs($experience->user)
            ->put(route('account.experiences.update', $experience), [
                'template' => 'classic',
                'title' => 'Us',
                'theme' => 'blush',
                'heart_count' => 9999,
                'view_count' => 9999,
                'access_key' => 'mine',
                'nfc_tag_uid' => '04:AA:BB:CC',
            ])
            ->assertSessionHasNoErrors();

        expect($experience->fresh())
            ->heart_count->toBe(0)
            ->view_count->toBe(0)
            ->access_key->toBe($key)
            ->nfc_tag_uid->toBeNull();
    });

    test('once a page is unpublished, an earlier visitor can no longer react to it', function () {
        $experience = DigitalExperience::factory()->create();
        tapTag($experience);
        $experience->update(['is_published' => false]);

        $this->post(route('experiences.heart', $experience))->assertNotFound();
        $this->post(route('experiences.replies.store', $experience), ['message' => 'still here?'])->assertNotFound();
    });
});

describe('Chaos monkey, sending the worst possible input', function () {
    test('a decompression-bomb image is refused instead of crashing the server', function () {
        $experience = DigitalExperience::factory()->create(['photos' => []]);
        $bomb = UploadedFile::fake()->createWithContent('bomb.png', pngHeader(width: 30000, height: 30000));

        $this->actingAs($experience->user)
            ->post(route('account.experiences.photos.store', $experience), ['photos' => [$bomb]])
            ->assertSessionHasErrors('photos');
    });

    test('blank, huge and oversized replies are rejected', function (array $reply, string $field) {
        $experience = DigitalExperience::factory()->create();
        tapTag($experience);

        $this->post(route('experiences.replies.store', $experience), $reply)->assertSessionHasErrors($field);
    })->with([
        'only spaces' => [['message' => "   \n  "], 'message'],
        'too long' => [['message' => str_repeat('a', 1001)], 'message'],
        'long name' => [['name' => str_repeat('b', 81), 'message' => 'hi'], 'name'],
        'array message' => [['message' => ['a', 'b']], 'message'],
    ]);

    test('a flood of replies to one page is capped so the owner\'s inbox survives', function () {
        Notification::fake();
        $experience = DigitalExperience::factory()->create();
        $experience->replies()->createMany(array_fill(0, ExperienceReactionController::MAX_REPLIES_PER_DAY, ['message' => 'spam']));
        tapTag($experience);

        $this->post(route('experiences.replies.store', $experience), ['message' => 'one more'])->assertSessionHasErrors('message');

        Notification::assertNothingSent();
    });

    test('an order status change he cannot see still emails only the real customer', function () {
        Notification::fake();
        $order = Order::factory()->selfCustomizedAndApproved()->status(OrderStatus::ReadyForShipment)->create();
        $intruder = User::factory()->create();

        $order->moveTo(OrderStatus::Shipped, User::factory()->admin()->create());

        Notification::assertSentTo($order->user, OrderUpdated::class);
        Notification::assertNotSentTo($intruder, OrderUpdated::class);
    });
});

/**
 * The text with upper and lower case letters swapped.
 */
function swapCase(string $text): string
{
    return implode('', array_map(
        fn (string $character): string => ctype_upper($character) ? strtolower($character) : strtoupper($character),
        str_split($text),
    ));
}

/**
 * Just the header of a PNG claiming the given size: a few bytes on disk
 * that would need gigabytes of memory to decode.
 */
function pngHeader(int $width, int $height): string
{
    $ihdr = pack('NNCCCCC', $width, $height, 8, 6, 0, 0, 0);
    $chunk = fn (string $type, string $data): string => pack('N', strlen($data)).$type.$data.pack('N', crc32($type.$data));

    return "\x89PNG\r\n\x1a\n".$chunk('IHDR', $ihdr).$chunk('IDAT', gzcompress(str_repeat("\0", 1024))).$chunk('IEND', '');
}
