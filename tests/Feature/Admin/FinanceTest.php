<?php

use App\Enums\ExpenseCategory;
use App\Enums\FinanceEntryType;
use App\Enums\PaymentKind;
use App\Enums\PaymentStatus;
use App\Models\FinanceEntry;
use App\Models\Payment;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
});

test('customers cannot open or change the finance ledger', function () {
    $customer = User::factory()->create();

    $this->actingAs($customer)->get(route('admin.finance.index'))->assertForbidden();
    $this->actingAs($customer)->post(route('admin.finance.store'), [])->assertForbidden();
});

test('an admin records an expense with the amount entered in pesos', function () {
    $this->actingAs($this->admin)->post(route('admin.finance.store'), [
        'type' => 'expense',
        'category' => 'materials',
        'amount' => '1250.75',
        'description' => 'Acrylic sheets',
        'occurred_on' => now()->toDateString(),
    ])->assertSessionHasNoErrors()->assertRedirect();

    expect(FinanceEntry::sole())
        ->type->toBe(FinanceEntryType::Expense)
        ->category->toBe(ExpenseCategory::Materials)
        ->amount->toBe(125075)
        ->recorded_by->toBe($this->admin->id);
});

test('an expense needs a category', function () {
    $this->actingAs($this->admin)->post(route('admin.finance.store'), [
        'type' => 'expense',
        'amount' => '100',
        'description' => 'Mystery spend',
        'occurred_on' => now()->toDateString(),
    ])->assertSessionHasErrors(['category' => 'Choose what the expense was for.']);
});

test('capital entries never keep a category', function () {
    $this->actingAs($this->admin)->post(route('admin.finance.store'), [
        'type' => 'capital',
        'category' => 'materials',
        'amount' => '50000',
        'description' => 'Initial investment',
        'occurred_on' => now()->toDateString(),
    ])->assertSessionHasNoErrors();

    expect(FinanceEntry::sole())->category->toBeNull();
});

test('entries cannot be dated in the future', function () {
    $this->actingAs($this->admin)->post(route('admin.finance.store'), [
        'type' => 'capital',
        'amount' => '100',
        'description' => 'Pledge',
        'occurred_on' => now()->addDay()->toDateString(),
    ])->assertSessionHasErrors(['occurred_on' => 'The date cannot be in the future.']);
});

test('an admin corrects and deletes an entry', function () {
    $entry = FinanceEntry::factory()->create();

    $this->actingAs($this->admin)->put(route('admin.finance.update', $entry), [
        'type' => 'expense',
        'category' => 'shipping',
        'amount' => '300',
        'description' => 'Courier pickup',
        'occurred_on' => now()->toDateString(),
    ])->assertSessionHasNoErrors();

    expect($entry->fresh())
        ->category->toBe(ExpenseCategory::Shipping)
        ->amount->toBe(30000);

    $this->actingAs($this->admin)->delete(route('admin.finance.destroy', $entry))->assertRedirect();

    expect(FinanceEntry::count())->toBe(0);
});

test('the overview combines capital, verified sales and the ledger', function () {
    FinanceEntry::factory()->capital()->create(['amount' => 1_000_000]);
    FinanceEntry::factory()->create(['amount' => 200_000]);
    FinanceEntry::factory()->withdrawal()->create(['amount' => 50_000]);
    FinanceEntry::factory()->income()->create(['amount' => 30_000]);

    Payment::factory()->verified()->create(['amount' => 500_000]);
    Payment::factory()->verified()->create(['amount' => 20_000, 'kind' => PaymentKind::Refund]);
    Payment::factory()->create(['amount' => 999_999]);

    $this->actingAs($this->admin)->get(route('admin.finance.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/finance/index')
            ->where('summary.overview.capital', 1_000_000)
            ->where('summary.overview.sales', 480_000)
            ->where('summary.overview.net_profit', 310_000)
            ->where('summary.overview.cash_on_hand', 1_260_000)
            ->where('summary.overview.recovered_percent', 31)
            ->where('summary.overview.left_to_recover', 690_000)
            ->where('summary.period.margin_percent', 61)
            ->where('summary.expense_breakdown.0.category', 'materials')
        );
});

test('the selected period limits profit and the ledger but not the overview', function () {
    $this->travelTo(now()->setDate(2026, 11, 15));

    FinanceEntry::factory()->create(['amount' => 10_000, 'occurred_on' => '2026-11-03']);
    FinanceEntry::factory()->create(['amount' => 40_000, 'occurred_on' => '2026-10-31']);
    Payment::factory()->verified()->create(['amount' => 70_000, 'reviewed_at' => '2026-10-20 10:00:00']);

    $this->actingAs($this->admin)->get(route('admin.finance.index', ['period' => 'last_month']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.period', 'last_month')
            ->where('summary.period.sales', 70_000)
            ->where('summary.period.expenses', 40_000)
            ->where('summary.overview.expenses', 50_000)
            ->has('entries.data', 1)
            ->where('entries.data.0.occurred_on', '2026-10-31')
            ->where('summary.trend.10', ['month' => '2026-10', 'income' => 70_000, 'expenses' => 40_000, 'net_profit' => 30_000])
        );
});

test('the monthly trend nets refunds, dates payments by verification and leaves out capital', function () {
    $this->travelTo(now()->setDate(2026, 11, 15));

    Payment::factory()->verified()->create(['amount' => 90_000, 'reviewed_at' => '2026-09-05 10:00:00']);
    Payment::factory()->verified()->create(['amount' => 15_000, 'kind' => PaymentKind::Refund, 'reviewed_at' => '2026-09-20 10:00:00']);
    Payment::factory()->verified()->create(['amount' => 25_000, 'created_at' => '2026-07-28 10:00:00', 'reviewed_at' => '2026-08-02 10:00:00']);
    Payment::factory()->create(['amount' => 40_000, 'status' => PaymentStatus::Verified, 'created_at' => '2026-08-10 10:00:00']);
    FinanceEntry::factory()->income()->create(['amount' => 30_000, 'occurred_on' => '2026-09-12']);
    FinanceEntry::factory()->create(['amount' => 20_000, 'occurred_on' => '2026-09-14']);
    FinanceEntry::factory()->capital()->create(['amount' => 500_000, 'occurred_on' => '2026-09-01']);

    $response = $this->actingAs($this->admin)->get(route('admin.finance.index'));

    $response->assertInertia(fn (Assert $page) => $page
        ->where('summary.trend.7', ['month' => '2026-07', 'income' => 0, 'expenses' => 0, 'net_profit' => 0])
        ->where('summary.trend.8', ['month' => '2026-08', 'income' => 65_000, 'expenses' => 0, 'net_profit' => 65_000])
        ->where('summary.trend.9', ['month' => '2026-09', 'income' => 105_000, 'expenses' => 20_000, 'net_profit' => 85_000])
    );
});
