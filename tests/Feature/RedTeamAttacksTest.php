<?php

use App\Actions\Errors\RenderErrorResponse;
use App\Enums\DesignMode;
use App\Enums\OptionGroup;
use App\Enums\OrderStatus;
use App\Models\Category;
use App\Models\DigitalExperience;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\ProductOption;
use App\Models\PromoCode;
use App\Models\Template;
use App\Models\User;
use App\Notifications\AdminOrderAlert;
use Illuminate\Cache\RateLimiter as CacheRateLimiter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;

/*
|--------------------------------------------------------------------------
| Red team attacks
|--------------------------------------------------------------------------
|
| Each test plays one attacker and asserts the DEFENDED behaviour, so a
| failing test means the attack still works. Thresholds (5 unpaid orders,
| 20 music lookups a minute...) are proposals; the defender owns the policy.
*/

/**
 * A ready-to-order product and a complete checkout for it.
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function redTeamCheckout(array $overrides = []): array
{
    $category = Category::factory()->create();
    $product = Product::factory()->create(['base_price' => 50000, 'design_fee' => 0, 'min_quantity' => 1, 'max_photos' => 3]);
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

describe('Order spammer, filling the shop with orders he never pays', function () {
    test('one customer cannot pile up unlimited unpaid orders, photos and admin emails', function () {
        Storage::fake('local');
        Notification::fake();
        $admin = User::factory()->admin()->create();
        $spammer = User::factory()->create();
        $checkout = redTeamCheckout();

        foreach (range(1, 10) as $attempt) {
            $this->actingAs($spammer)->post(route('orders.store'), [
                ...$checkout,
                'customer_notes' => "Spam order {$attempt}",
                'photos' => [
                    UploadedFile::fake()->image("a{$attempt}.jpg"),
                    UploadedFile::fake()->image("b{$attempt}.jpg"),
                    UploadedFile::fake()->image("c{$attempt}.jpg"),
                ],
            ]);
        }

        expect(Order::count())->toBeLessThanOrEqual(5)
            ->and(Notification::sent($admin, AdminOrderAlert::class)->count())->toBeLessThanOrEqual(5);
    });

    test('unpaid orders cannot use up a limited promo code before real customers', function () {
        $promoCode = PromoCode::factory()->create(['code' => 'LAUNCH50', 'max_uses' => 3]);
        $spammer = User::factory()->create();
        $realCustomer = User::factory()->create();
        $checkout = redTeamCheckout();

        foreach (range(1, 3) as $attempt) {
            $this->actingAs($spammer)->post(route('orders.store'), [...$checkout, 'promo_code' => 'LAUNCH50', 'customer_notes' => "Hold {$attempt}"]);
        }

        $this->actingAs($realCustomer)
            ->post(route('orders.store'), [...$checkout, 'promo_code' => $promoCode->code, 'customer_phone' => '0918 765 4321'])
            ->assertSessionHasNoErrors();
    });
});

describe('Credential stuffer, trying leaked passwords', function () {
    test('one address trying passwords against many accounts gets slowed down', function () {
        $accounts = User::factory()->count(20)->create();
        $statuses = collect();

        foreach ($accounts as $account) {
            foreach (range(1, 5) as $guess) {
                $statuses->push($this->post(route('login.store'), ['email' => $account->email, 'password' => "leaked-{$guess}"])->status());
            }
        }

        expect($statuses)->toContain(429);
    });

    test('one account attacked from many addresses gets slowed down', function () {
        $victim = User::factory()->create();
        $statuses = collect();

        foreach (range(1, 50) as $attempt) {
            $statuses->push($this->withServerVariables(['REMOTE_ADDR' => "203.0.113.{$attempt}"])
                ->post(route('login.store'), ['email' => $victim->email, 'password' => "guess-{$attempt}"])
                ->status());
        }

        expect($statuses)->toContain(429);
    })->skip('Won\'t fix (blue team): a per-account limit across networks lets anyone lock real customers out, and production passwords (12+ characters, mixed case, symbols, not leaked) make slow guessing useless.');
});

describe('Quota burner, using the song search as a free proxy', function () {
    test('one visitor cannot push Taptale over the music services\' rate limits', function () {
        Http::preventStrayRequests();
        Http::fake([
            'itunes.apple.com/*' => Http::response(['resultCount' => 0, 'results' => []]),
            'lrclib.net/*' => Http::response([], 404),
        ]);

        foreach (range(1, 60) as $attempt) {
            $this->getJson(route('songs.lookup', ['title' => "Made up song {$attempt}"]));
        }

        expect(Http::recorded(fn ($request) => str_contains($request->url(), 'itunes.apple.com'))->count())
            ->toBeLessThanOrEqual(20);
    });
});

describe('Address hopper, rotating through one IPv6 network', function () {
    test('rotating addresses does not dodge the sign-up limit', function () {
        foreach (range(1, 20) as $attempt) {
            $this->withServerVariables(['REMOTE_ADDR' => sprintf('2001:db8:85a3:8d3::%x', $attempt)])
                ->post(route('register.store'), [
                    'name' => "Hopper {$attempt}",
                    'email' => "hopper{$attempt}@example.com",
                    'password' => 'Str0ng!Passw0rd#2026',
                    'password_confirmation' => 'Str0ng!Passw0rd#2026',
                ]);
            auth()->logout();
        }

        expect(User::count())->toBeLessThanOrEqual(5);
    });

    test('rotating addresses does not dodge the not-found limit', function () {
        $statuses = collect(range(1, RenderErrorResponse::NOT_FOUND_LIMIT + 10))
            ->map(fn (int $attempt) => $this->withServerVariables(['REMOTE_ADDR' => sprintf('2001:db8:85a3:8d3::%x', $attempt)])
                ->get("/missing-page-{$attempt}")
                ->status());

        expect($statuses)->toContain(429);
    });
});

describe('Slow filler, leaving dead rows in the cache table', function () {
    test('expired rate-limit rows are cleaned up instead of piling up forever', function () {
        config(['cache.default' => 'database', 'cache.limiter' => 'database']);
        app()->forgetInstance(CacheRateLimiter::class);
        RateLimiter::clearResolvedInstances();

        foreach (range(1, 30) as $visitor) {
            $this->withServerVariables(['REMOTE_ADDR' => "198.51.100.{$visitor}"])->get("/missing-page-{$visitor}");
        }

        $this->travelTo(now()->addDays(2)->startOfDay());
        $this->artisan('schedule:run');

        expect(DB::table('cache')->where('expiration', '<=', now()->getTimestamp())->count())->toBe(0);
    });
});

describe('Deposit dodger, cancelling after part of the money is in', function () {
    test('cancelling online after a verified payment is refused, or tells the studio a refund is owed', function () {
        $customer = User::factory()->create();
        $order = Order::factory()->for($customer)->status(OrderStatus::AwaitingPayment)->create(['total' => 75000]);
        Payment::factory()->verified()->for($order)->create(['amount' => 30000]);

        $this->actingAs($customer)->post(route('account.orders.cancel', $order));

        $isCancelled = $order->fresh()->status === OrderStatus::Cancelled;
        $refundFlagged = $order->activities()->where('is_internal', true)->where('body', 'like', '%efund%')->exists();
        expect(! $isCancelled || $refundFlagged)->toBeTrue();
    });
});

/*
|--------------------------------------------------------------------------
| Round 3: bypassing the fixes
|--------------------------------------------------------------------------
*/

describe('Receipt faker, dodging the unpaid-order cap', function () {
    test('sending a ₱1 junk receipt does not free a slot for another unpaid order', function () {
        Storage::fake('local');
        $spammer = User::factory()->create();
        $checkout = redTeamCheckout();

        foreach (range(1, 6) as $attempt) {
            $this->actingAs($spammer)->post(route('orders.store'), [...$checkout, 'customer_notes' => "Order {$attempt}"]);
            $this->actingAs($spammer)->post(route('account.orders.payments.store', Order::query()->latest('id')->first()), [
                'payment_method_id' => $checkout['payment_method_id'],
                'amount' => 1,
                'reference_number' => "JUNK{$attempt}",
                'proof' => UploadedFile::fake()->image("junk{$attempt}.jpg"),
            ]);
        }

        expect(Order::count())->toBeLessThanOrEqual((int) config('taptale.max_unpaid_orders'));
    });
});

describe('Alias collector, one inbox behind many accounts', function () {
    test('Gmail aliases of one inbox count as one customer for a one-use promo', function () {
        PromoCode::factory()->create(['code' => 'WELCOME50']);
        $checkout = redTeamCheckout();

        foreach (['ana@gmail.com', 'ana+2@gmail.com', 'a.na@gmail.com', 'ana+3@googlemail.com'] as $index => $email) {
            $this->actingAs(User::factory()->create(['email' => $email]))
                ->post(route('orders.store'), [...$checkout, 'promo_code' => 'WELCOME50', 'customer_notes' => "Alias {$index}"]);
        }

        expect(Order::query()->whereNotNull('promo_code_id')->count())->toBe(1);
    });
});

describe('Quota burner, round two', function () {
    test('changing a memory page song title over and over cannot push Taptale over the music services\' limits', function () {
        Http::preventStrayRequests();
        Http::fake([
            'itunes.apple.com/*' => Http::response(['resultCount' => 0, 'results' => []]),
            'lrclib.net/*' => Http::response([], 404),
        ]);
        $experience = DigitalExperience::factory()->create();

        foreach (range(1, 40) as $attempt) {
            $this->actingAs($experience->user)
                ->patch(route('account.experiences.content', $experience), ['field' => 'song_title', 'value' => "Made up song {$attempt}"]);
        }

        expect(Http::recorded(fn ($request) => str_contains($request->url(), 'itunes.apple.com'))->count())
            ->toBeLessThanOrEqual(15);
    });

    test('one network cannot use up the shared song budget and leave real visitors without results', function () {
        Http::fake([
            'itunes.apple.com/*' => Http::response(['resultCount' => 1, 'results' => [[
                'trackName' => 'Perfect',
                'artistName' => 'Ed Sheeran',
                'previewUrl' => 'https://audio.example.com/perfect.m4a',
            ]]]),
            'lrclib.net/*' => Http::response([], 404),
        ]);

        foreach (range(1, 15) as $attempt) {
            $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.7'])
                ->getJson(route('songs.lookup', ['title' => "Junk {$attempt}"]));
        }

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.50'])
            ->getJson(route('songs.lookup', ['title' => 'Perfect', 'artist' => 'Ed Sheeran']))
            ->assertJsonPath('preview_url', 'https://audio.example.com/perfect.m4a');
    });
});

/*
|--------------------------------------------------------------------------
| Round 4: new ground
|--------------------------------------------------------------------------
*/

describe('Account farmer, parking photos on orders he abandons', function () {
    test('abandoned unpaid orders and their photos are cleaned up after a while', function () {
        Storage::fake('local');
        $checkout = redTeamCheckout();

        foreach (['farm1@example.com', 'farm2@example.com'] as $index => $email) {
            $this->actingAs(User::factory()->create(['email' => $email]))->post(route('orders.store'), [
                ...$checkout,
                'customer_notes' => "Parked {$index}",
                'photos' => [UploadedFile::fake()->image("parked{$index}.jpg")],
            ]);
        }

        expect(Storage::disk('local')->allFiles())->toHaveCount(2);

        $this->travelTo(now()->addDays(30)->startOfDay());
        $this->artisan('schedule:run');

        expect(Storage::disk('local')->allFiles())->toBeEmpty();
    });
});

/*
|--------------------------------------------------------------------------
| Round 5: bypassing the round 3 fixes
|--------------------------------------------------------------------------
*/

describe('Order churner, cancelling to make room under the cap', function () {
    test('placing and cancelling over and over cannot flood the shop with orders and admin emails', function () {
        Storage::fake('local');
        Notification::fake();
        $admin = User::factory()->admin()->create();
        $churner = User::factory()->create();
        $checkout = redTeamCheckout();

        foreach (range(1, 10) as $attempt) {
            $this->actingAs($churner)->post(route('orders.store'), [
                ...$checkout,
                'customer_notes' => "Churn {$attempt}",
                'photos' => [UploadedFile::fake()->image("churn{$attempt}.jpg")],
            ]);
            $this->actingAs($churner)->post(route('account.orders.cancel', Order::query()->latest('id')->first()));
        }

        expect(Order::count())->toBeLessThanOrEqual(5)
            ->and(Notification::sent($admin, AdminOrderAlert::class)->count())->toBeLessThanOrEqual(5);
    });
});

describe('Domain owner, one person behind a catch-all inbox', function () {
    test('accounts on one catch-all domain with the same phone count as one customer for a one-use promo', function () {
        PromoCode::factory()->create(['code' => 'WELCOME50']);
        $checkout = redTeamCheckout(['customer_phone' => '0917 555 0101']);

        foreach (['ana', 'bea', 'cora'] as $index => $name) {
            $this->actingAs(User::factory()->create(['email' => "{$name}@delacruz-family.ph"]))
                ->post(route('orders.store'), [...$checkout, 'promo_code' => 'WELCOME50', 'customer_notes' => "Domain {$index}"]);
        }

        expect(Order::query()->whereNotNull('promo_code_id')->count())->toBe(1);
    });
});

describe('Budget hog, round two: four ordinary addresses', function () {
    test('four IPv4 addresses cannot use up the visitor song budget and leave real visitors without results', function () {
        Http::fake([
            'itunes.apple.com/*' => Http::response(['resultCount' => 1, 'results' => [[
                'trackName' => 'Perfect',
                'artistName' => 'Ed Sheeran',
                'previewUrl' => 'https://audio.example.com/perfect.m4a',
            ]]]),
            'lrclib.net/*' => Http::response([], 404),
        ]);

        foreach (['198.51.100.7', '198.51.100.8', '198.51.100.9', '198.51.100.10'] as $address) {
            foreach (range(1, 3) as $attempt) {
                $this->withServerVariables(['REMOTE_ADDR' => $address])
                    ->getJson(route('songs.lookup', ['title' => "Junk {$address} {$attempt}"]));
            }
        }

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.50'])
            ->getJson(route('songs.lookup', ['title' => 'Perfect', 'artist' => 'Ed Sheeran']))
            ->assertJsonPath('preview_url', 'https://audio.example.com/perfect.m4a');
    })->skip('Won\'t fix (blue team): any fixed global budget can be drained by enough networks; the durable fix is searching iTunes from the visitor\'s browser, a product change. Impact is wizard previews pausing up to a minute; memory pages have their own budget and found songs are cached for a week.');
});

describe('Code guesser, probing promo codes without an account', function () {
    test('guests cannot probe promo codes', function () {
        PromoCode::factory()->create(['code' => 'STAFF100']);

        $this->getJson(route('promo-codes.check', ['code' => 'STAFF100', 'subtotal' => 50000]))->assertUnauthorized();
    });
});

/*
|--------------------------------------------------------------------------
| Round 6: bypassing the round 5 fixes
|--------------------------------------------------------------------------
*/

describe('Account farmer, round two: many verified accounts from one address', function () {
    test('one address cannot open more than a handful of accounts in a day', function () {
        foreach (range(1, 20) as $attempt) {
            if ($attempt % 5 === 1 && $attempt > 1) {
                $this->travel(11)->minutes();
            }

            $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.20'])->post(route('register.store'), [
                'name' => "Farm {$attempt}",
                'email' => "farm{$attempt}@delacruz-family.ph",
                'password' => 'Str0ng!Passw0rd#2026',
                'password_confirmation' => 'Str0ng!Passw0rd#2026',
            ]);
            auth()->logout();
        }

        expect(User::count())->toBeLessThanOrEqual(10);
    });
});

describe('Phone formatter, writing the same number another way', function () {
    test('the same mobile number written with an international prefix still counts as one customer', function (string $samePhone) {
        PromoCode::factory()->create(['code' => 'WELCOME50']);
        $checkout = redTeamCheckout(['customer_phone' => '0917 555 0101']);

        $this->actingAs(User::factory()->create(['email' => 'ana@delacruz-family.ph']))
            ->post(route('orders.store'), [...$checkout, 'promo_code' => 'WELCOME50', 'customer_notes' => 'First']);
        $this->actingAs(User::factory()->create(['email' => 'bea@delacruz-family.ph']))
            ->post(route('orders.store'), [...$checkout, 'promo_code' => 'WELCOME50', 'customer_phone' => $samePhone, 'customer_notes' => 'Second']);

        expect(Order::query()->whereNotNull('promo_code_id')->count())->toBe(1);
    })->with([
        '+63 with the leading 0 kept' => '+63 0917 555 0101',
        '0063 international dialing' => '0063 917 555 0101',
    ]);
});

/*
|--------------------------------------------------------------------------
| Round 7: bypassing the round 6 fixes
|--------------------------------------------------------------------------
*/

describe('Alert silencer, using up the admins\' receipt alerts with junk', function () {
    test('junk receipts from other accounts cannot silence the alert for a real customer\'s payment', function () {
        Storage::fake('local');
        Notification::fake();
        $admin = User::factory()->admin()->create();
        $checkout = redTeamCheckout();

        foreach (range(1, 10) as $account) {
            $farmer = User::factory()->create();

            foreach (range(1, 3) as $attempt) {
                $this->actingAs($farmer)->post(route('orders.store'), [...$checkout, 'customer_notes' => "Farm {$account}-{$attempt}"]);
                $this->actingAs($farmer)->post(route('account.orders.payments.store', Order::query()->latest('id')->first()), [
                    'payment_method_id' => $checkout['payment_method_id'],
                    'amount' => 1,
                    'reference_number' => "JUNK{$account}{$attempt}",
                    'proof' => UploadedFile::fake()->image("junk{$account}{$attempt}.jpg"),
                ]);
            }
        }

        $realCustomer = User::factory()->create();
        $this->actingAs($realCustomer)->post(route('orders.store'), [...$checkout, 'customer_phone' => '0918 765 4321', 'customer_notes' => 'Real order']);
        $realOrder = Order::query()->latest('id')->first();
        $this->actingAs($realCustomer)->post(route('account.orders.payments.store', $realOrder), [
            'payment_method_id' => $checkout['payment_method_id'],
            'amount' => $realOrder->total / 100,
            'reference_number' => 'GCASH-REAL-1',
            'proof' => UploadedFile::fake()->image('real-receipt.jpg'),
        ]);

        Notification::assertSentTo($admin, AdminOrderAlert::class, fn (AdminOrderAlert $alert): bool => $alert->order->is($realOrder));
    });
});
