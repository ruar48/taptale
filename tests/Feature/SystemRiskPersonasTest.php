<?php

/*
|--------------------------------------------------------------------------
| System risk personas
|--------------------------------------------------------------------------
|
| A second, deeper round of imaginary customers, aimed at the whole shop:
| accounts, payments, the order workflow, sign-up and every public page.
| Each persona does something a real person would plausibly do, by
| accident or on purpose, that could cost money, data or uptime.
|
*/

use App\Enums\ActivityType;
use App\Enums\DesignMode;
use App\Enums\ExperienceTemplate;
use App\Enums\OptionGroup;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\ProofStatus;
use App\Models\Category;
use App\Models\DesignProof;
use App\Models\DigitalExperience;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\ProductOption;
use App\Models\PromoCode;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake('local');
    Notification::fake();
});

/*
|--------------------------------------------------------------------------
| Real customers
|--------------------------------------------------------------------------
*/

describe('Carlo, who deletes his account after paying', function () {
    test('an account with orders cannot be deleted, so the order, payment and memory page survive', function () {
        $order = Order::factory()->status(OrderStatus::InProduction)->create();
        Payment::factory()->verified()->for($order)->create(['amount' => 75000]);
        $experience = DigitalExperience::factory()->for($order)->create(['user_id' => $order->user_id]);

        $this->actingAs($order->user)
            ->delete(route('profile.destroy'), ['password' => 'password'])
            ->assertSessionHasErrors('password');

        $this->assertModelExists($order->user);
        expect($order->payments()->where('status', PaymentStatus::Verified)->count())->toBe(1)
            ->and(DigitalExperience::whereKey($experience->id)->exists())->toBeTrue();
    });

    test('an account without orders can still be deleted', function () {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->delete(route('profile.destroy'), ['password' => 'password'])
            ->assertRedirect('/');

        $this->assertModelMissing($user);
    });
});

describe('Bea, who stacks a 100% promo on a free-delivery order', function () {
    test('a free order moves straight on instead of waiting forever for a ₱0 payment', function () {
        config(['taptale.delivery_fee' => 15000, 'taptale.free_delivery_threshold' => 100000]);
        $category = Category::factory()->create();
        $product = Product::factory()->create(['base_price' => 100000, 'design_fee' => 0, 'min_quantity' => 1]);
        $category->products()->attach($product);
        $size = ProductOption::factory()->for($product)->group(OptionGroup::Size)->create();
        PromoCode::factory()->create(['code' => 'FREEBIE', 'discount_value' => 100]);

        $this->actingAs(User::factory()->create())->post(route('orders.store'), [
            'category_id' => $category->id,
            'product_id' => $product->id,
            'design_mode' => DesignMode::SelfCustomized->value,
            'option_ids' => [$size->id],
            'quantity' => 1,
            'personalization' => ['names' => 'Bea'],
            'approve_preview' => true,
            'customer_name' => 'Bea Santos',
            'customer_email' => 'bea@example.com',
            'customer_phone' => '0917 765 4321',
            'address_line' => '1 Rizal Ave.',
            'city' => 'Manila',
            'province' => 'Metro Manila',
            'postal_code' => '1000',
            'payment_method_id' => PaymentMethod::factory()->create()->id,
            'promo_code' => 'FREEBIE',
        ])->assertSessionHasNoErrors();

        expect(Order::sole())
            ->total->toBe(0)
            ->status->not->toBe(OrderStatus::AwaitingPayment);
    });
});

describe('Marites, who approves a design before paying', function () {
    test('approving an early design does not skip payment, and she can still pay', function () {
        $order = Order::factory()->status(OrderStatus::AwaitingPayment)->create(['total' => 75000]);
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->post(route('admin.orders.proofs.store', $order), ['proof' => UploadedFile::fake()->image('draft.png')])
            ->assertSessionHasNoErrors();

        expect($order->fresh()->status->acceptsPayment())->toBeTrue();

        $proof = $order->proofs()->sole();

        $this->actingAs($order->user)
            ->post(route('account.orders.proofs.approve', [$order, $proof]))
            ->assertSessionHasNoErrors();

        $order->refresh();

        expect($proof->fresh()->status)->toBe(ProofStatus::Approved)
            ->and($order->isDesignApproved())->toBeTrue()
            ->and($order->status)->toBe(OrderStatus::AwaitingPayment);
    });

    test('once she pays in full, the approved design goes straight to production', function () {
        $order = Order::factory()->status(OrderStatus::PaymentVerification)->create(['total' => 75000]);
        DesignProof::factory()->for($order)->create(['status' => ProofStatus::Approved]);
        $payment = Payment::factory()->for($order)->create(['amount' => 75000, 'status' => PaymentStatus::Submitted]);

        $this->actingAs(User::factory()->admin()->create())
            ->post(route('admin.payments.verify', $payment))
            ->assertSessionHasNoErrors();

        expect($order->fresh()->status)->toBe(OrderStatus::DesignApproved);
    });
});

describe('Dodong, who opens strange links people send him', function () {
    test('mangled wizard links still open the wizard', function (array $query) {
        $this->get(route('orders.create', $query))->assertOk();
    })->with([
        'array category' => [['category' => ['a', 'b']]],
        'array product' => [['product' => ['x']]],
        'array template' => [['template' => ['y']]],
        'unknown slugs' => [['category' => 'nope', 'product' => 'nope', 'template' => 'nope']],
    ]);
});

describe('Lola Cora, who opens every memory page design', function () {
    test('every design demo opens', function (ExperienceTemplate $template) {
        $this->get(route('experiences.demo', $template->value))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('storefront/experience'));
    })->with(ExperienceTemplate::cases());
});

/*
|--------------------------------------------------------------------------
| Attackers
|--------------------------------------------------------------------------
*/

describe('Sign-up bot, burning the shop\'s email quota', function () {
    test('mass sign-ups from one address are slowed down', function () {
        foreach (range(1, 5) as $attempt) {
            $this->post(route('register.store'), [
                'name' => "Bot {$attempt}",
                'email' => "bot{$attempt}@example.com",
                'password' => 'Str0ng!Passw0rd#2026',
                'password_confirmation' => 'Str0ng!Passw0rd#2026',
            ]);
            auth()->logout();
        }

        $this->post(route('register.store'), [
            'name' => 'Bot 6',
            'email' => 'bot6@example.com',
            'password' => 'Str0ng!Passw0rd#2026',
            'password_confirmation' => 'Str0ng!Passw0rd#2026',
        ])->assertTooManyRequests();

        expect(User::count())->toBe(5);
    });

    test('password-reset emails to many addresses are slowed down', function () {
        foreach (range(1, 5) as $attempt) {
            $this->post(route('password.email'), ['email' => "victim{$attempt}@example.com"]);
        }

        $this->post(route('password.email'), ['email' => 'victim6@example.com'])->assertTooManyRequests();
    });
});

describe('Cookie tamperer, editing the unencrypted appearance cookie', function () {
    test('a hostile appearance value is ignored, not printed into the page script', function (string $value) {
        $this->withUnencryptedCookie('appearance', $value)
            ->get(route('home'))
            ->assertOk()
            ->assertSee("const appearance = 'light';", false)
            ->assertDontSee($value, false);
    })->with([
        'script breakout' => ["'</script><script>alert(1)</script>"],
        'backslash' => ['dark\\'],
        'unknown' => ['purple'],
    ]);
});

describe('Field fuzzer, sending arrays where text belongs', function () {
    test('an array as the field name is a validation error, not a crash', function () {
        $experience = DigitalExperience::factory()->create();

        $this->actingAs($experience->user)
            ->patch(route('account.experiences.content', $experience), ['field' => ['title'], 'value' => 'x'])
            ->assertSessionHasErrors('field');
    });
});

describe('Workflow skipper, trying to get an unpaid order made', function () {
    test('a revision request on an unpaid order keeps it waiting for payment', function () {
        $order = Order::factory()->status(OrderStatus::AwaitingPayment)->create(['total' => 75000]);
        $proof = DesignProof::factory()->for($order)->create();

        $this->actingAs($order->user)
            ->post(route('account.orders.proofs.revision', [$order, $proof]), ['comment' => 'Bigger names please'])
            ->assertSessionHasNoErrors();

        expect($order->fresh()->status->acceptsPayment())->toBeTrue();
    });

    test('the production board marks orders that still owe money', function () {
        $paid = Order::factory()->selfCustomizedAndApproved()->status(OrderStatus::DesignApproved)->create(['total' => 75000]);
        Payment::factory()->verified()->for($paid)->create(['amount' => 75000]);
        $unpaid = Order::factory()->selfCustomizedAndApproved()->status(OrderStatus::DesignApproved)->create(['total' => 75000]);

        $this->actingAs(User::factory()->admin()->create())
            ->get(route('admin.production'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('columns.0.orders', fn ($orders) => collect($orders)->firstWhere('reference', $paid->reference)['balance_due'] === 0
                    && collect($orders)->firstWhere('reference', $unpaid->reference)['balance_due'] === 75000));
    });
});

describe('Wedding guests sharing the venue Wi-Fi', function () {
    test('a guest can still write back after the page was opened and hearted', function () {
        $experience = DigitalExperience::factory()->create();
        tapTag($experience);

        foreach (range(1, 6) as $view) {
            $this->get(route('experiences.show', $experience))->assertOk();
        }

        $this->post(route('experiences.heart', $experience))->assertRedirect();

        $this->post(route('experiences.replies.store', $experience), ['message' => 'Congratulations to you both!'])
            ->assertSessionHasNoErrors()
            ->assertRedirect();
    });
});

describe('Ate Joy again, editing her page quickly', function () {
    test('many quick text edits do not block her next photo upload', function () {
        $experience = DigitalExperience::factory()->create(['photos' => []]);
        $this->actingAs($experience->user);

        foreach (range(1, 31) as $edit) {
            $this->patch(route('account.experiences.content', $experience), ['field' => 'title', 'value' => "Us {$edit}"]);
        }

        $this->post(route('account.experiences.photos.store', $experience), [
            'photos' => [UploadedFile::fake()->image('us.jpg')],
        ])->assertSessionHasNoErrors()->assertRedirect();
    });
});

describe('Timeline snooper, looking for internal notes', function () {
    test('internal studio notes never reach the customer\'s order page or inbox', function () {
        $order = Order::factory()->create();
        $order->recordActivity(ActivityType::Note, 'Customer seems difficult, check payment twice', User::factory()->admin()->create(), internal: true);

        $this->actingAs($order->user)
            ->get(route('account.orders.show', $order))
            ->assertInertia(fn (Assert $page) => $page->where('order.activities', fn ($activities) => collect($activities)->every(fn ($activity) => ! str_contains((string) $activity['body'], 'difficult'))));

        Notification::assertNothingSentTo($order->user);
    });
});

afterEach(function () {
    RateLimiter::clear('register');
});
