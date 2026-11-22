<?php

use App\Actions\Errors\RenderErrorResponse;
use App\Enums\DesignMode;
use App\Enums\OptionGroup;
use App\Enums\OrderStatus;
use App\Models\Category;
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
            ->post(route('orders.store'), [...$checkout, 'promo_code' => $promoCode->code])
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
    });
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
