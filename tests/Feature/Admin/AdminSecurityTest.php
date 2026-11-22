<?php

use App\Models\AuditLog;
use App\Models\Category;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('an admin without two-factor authentication is sent to turn it on', function () {
    $admin = User::factory()->admin()->create([
        'two_factor_secret' => null,
        'two_factor_recovery_codes' => null,
        'two_factor_confirmed_at' => null,
    ]);

    $this->actingAs($admin)->get(route('admin.dashboard'))->assertRedirect(route('security.edit'));
    $this->actingAs($admin)->delete(route('admin.categories.destroy', Category::factory()->create()))->assertRedirect(route('security.edit'));

    expect(Category::count())->toBe(1);
});

test('the two-factor requirement for admins can be switched off', function () {
    config(['taptale.admin_requires_two_factor' => false]);
    $admin = User::factory()->admin()->create(['two_factor_secret' => null, 'two_factor_confirmed_at' => null]);

    $this->actingAs($admin)->get(route('admin.dashboard'))->assertOk();
});

test('pages are served with browser security headers', function () {
    $this->get(route('home'))
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
        ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
        ->assertHeader('Content-Security-Policy', "frame-ancestors 'self'; base-uri 'self'; object-src 'none'");
});

test('admin changes are recorded in the audit log', function () {
    $admin = User::factory()->admin()->create();
    $category = Category::factory()->create();

    $originalKey = (string) $category->getRouteKey();

    $this->actingAs($admin)
        ->put(route('admin.categories.update', $category), [
            'name' => 'Anniversary',
            'accent_color' => '#B86F83',
            'icon' => 'heart',
            'is_active' => true,
            'sort_order' => 1,
            'password' => 'never-logged',
        ])
        ->assertSessionHasNoErrors();

    $log = AuditLog::sole();

    expect($log)
        ->user_id->toBe($admin->id)
        ->action->toBe('admin.categories.update')
        ->method->toBe('PUT')
        ->subject->toBe(['category' => $originalKey])
        ->and($log->changes)->toMatchArray(['name' => 'Anniversary'])
        ->and($log->changes)->not->toHaveKey('password');

    $this->actingAs($admin)
        ->get(route('admin.audit-log'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/audit-log')
            ->where('logs.data.0.action', 'Categories — Updated'));
});

test('failed and read-only admin requests are not logged', function () {
    $admin = User::factory()->admin()->create();
    $category = Category::factory()->create();

    $this->actingAs($admin)->get(route('admin.categories.index'))->assertOk();
    $this->actingAs($admin)->put(route('admin.categories.update', $category), ['name' => ''])->assertSessionHasErrors('name');

    expect(AuditLog::count())->toBe(0);
});
