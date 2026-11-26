<?php

use App\Enums\DiscountType;
use App\Enums\OrderStatus;
use App\Enums\PaymentKind;
use App\Models\FinanceEntry;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PromoCode;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
});

test('orders export as CSV with the list filters, and formulas are neutralised', function () {
    $shipped = Order::factory()->status(OrderStatus::Shipped)->create([
        'customer_name' => '=HYPERLINK("http://evil.test","Click")',
        'total' => 123450,
    ]);
    $cancelled = Order::factory()->status(OrderStatus::Cancelled)->create();

    $response = $this->actingAs($this->admin)
        ->get(route('admin.orders.export', ['status' => OrderStatus::Shipped->value]))
        ->assertOk()
        ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

    $csv = $response->streamedContent();

    expect($csv)
        ->toContain($shipped->reference)
        ->toContain('1234.5')
        ->toContain('"\'=HYPERLINK(""http://evil.test"",""Click"")"')
        ->not->toContain($cancelled->reference);
});

test('the finance export lists payments, refunds and ledger entries with signed amounts', function () {
    $order = Order::factory()->create();
    Payment::factory()->verified()->for($order)->create(['amount' => 50000]);
    Payment::factory()->verified()->for($order)->create(['amount' => 10000, 'kind' => PaymentKind::Refund]);
    Payment::factory()->for($order)->create(['amount' => 99900]);
    FinanceEntry::factory()->create(['amount' => 20000, 'description' => 'Acrylic sheets']);

    $csv = $this->actingAs($this->admin)
        ->get(route('admin.finance.export', ['period' => 'this_month']))
        ->assertOk()
        ->streamedContent();

    expect($csv)
        ->toContain('"Order payment",,'.$order->payments()->where('amount', 50000)->value('reference_number').','.$order->reference.',500')
        ->toContain(',-100,')
        ->toContain('"Acrylic sheets",,-200')
        ->and(substr_count(trim($csv), "\n"))->toBe(3);
});

test('customers cannot use the admin tools', function () {
    $customer = User::factory()->create();

    $this->actingAs($customer)->get(route('admin.orders.export'))->assertForbidden();
    $this->actingAs($customer)->get(route('admin.production'))->assertForbidden();
    $this->actingAs($customer)->get(route('admin.audit-log'))->assertForbidden();
});

test('the production board groups paid orders by workshop stage', function () {
    $approved = Order::factory()->selfCustomizedAndApproved()->status(OrderStatus::PendingDesign)->create();
    $making = Order::factory()->selfCustomizedAndApproved()->status(OrderStatus::InProduction)->create();
    Order::factory()->status(OrderStatus::AwaitingPayment)->create();

    $this->actingAs($this->admin)
        ->get(route('admin.production'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/production')
            ->where('columns.0.status', 'pending_design')
            ->where('columns.0.next_status', 'in_production')
            ->where('columns.0.orders.0.reference', $approved->reference)
            ->where('columns.1.orders.0.reference', $making->reference)
            ->has('columns.2.orders', 0));
});

test('the packing slip opens for an order', function () {
    $order = Order::factory()->create(['is_gift' => true, 'gift_message' => 'Happy birthday!']);

    $this->actingAs($this->admin)
        ->get(route('admin.orders.packing-slip', $order))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/orders/packing-slip')
            ->where('order.is_gift', true)
            ->where('order.gift_message', 'Happy birthday!'));
});

test('an admin adds a tracking link and only web links are accepted', function () {
    $order = Order::factory()->create();

    $this->actingAs($this->admin)
        ->put(route('admin.orders.shipping', $order), ['tracking_url' => 'javascript:alert(1)'])
        ->assertSessionHasErrors('tracking_url');

    $this->actingAs($this->admin)
        ->put(route('admin.orders.shipping', $order), [
            'courier' => 'LBC',
            'tracking_number' => 'LBC123',
            'tracking_url' => 'https://tracking.example/LBC123',
        ])
        ->assertSessionHasNoErrors();

    expect($order->fresh()->tracking_url)->toBe('https://tracking.example/LBC123');
});

test('an admin creates a promo code in pesos that works through its last day', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.promo-codes.store'), [
            'code' => 'pasko-50',
            'discount_type' => DiscountType::Fixed->value,
            'discount_value' => '50',
            'min_subtotal' => '300',
            'ends_at' => '2026-12-25',
            'is_active' => true,
        ])
        ->assertSessionHasNoErrors();

    $promoCode = PromoCode::sole();

    expect($promoCode)
        ->code->toBe('PASKO-50')
        ->discount_value->toBe(5000)
        ->min_subtotal->toBe(30000)
        ->and($promoCode->ends_at->setTimezone('Asia/Manila')->format('Y-m-d H:i'))->toBe('2026-12-25 23:59');
});

test('percent promo codes cannot exceed 100 percent', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.promo-codes.store'), [
            'code' => 'FREE',
            'discount_type' => DiscountType::Percent->value,
            'discount_value' => 150,
        ])
        ->assertSessionHasErrors('discount_value');
});
