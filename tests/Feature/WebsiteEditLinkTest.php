<?php

use App\Models\DigitalExperience;
use App\Models\Order;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->order = Order::factory()->create(['user_id' => null]);
    $this->order->issueApprovalToken();
    $this->experience = DigitalExperience::factory()->for($this->order)->create(['user_id' => null, 'title' => 'Before']);
});

test('a customer without an account fills in their website from the edit link', function () {
    $this->get($this->order->websiteEditUrl())
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('storefront/website-edit'));

    $this->patch(route('account.experiences.content', $this->experience), ['field' => 'title', 'value' => 'Ana & Leo'])
        ->assertSessionHasNoErrors();

    expect($this->experience->fresh()->title)->toBe('Ana & Leo');
});

test('the edit link needs the right key', function () {
    $this->get(route('website-edit.show', ['experience' => $this->experience, 'k' => 'wrong']))->assertNotFound();

    $this->patch(route('account.experiences.content', $this->experience), ['field' => 'title', 'value' => 'Hacked'])
        ->assertForbidden();

    expect($this->experience->fresh()->title)->toBe('Before');
});

test('turning the link off ends editing for a browser that already opened it', function () {
    $this->get($this->order->websiteEditUrl())->assertOk();

    $this->order->revokeApprovalToken();

    $this->patch(route('account.experiences.content', $this->experience), ['field' => 'title', 'value' => 'Too late'])
        ->assertForbidden();

    expect($this->experience->fresh()->title)->toBe('Before');
});

test('an edit link only opens its own website', function () {
    $other = DigitalExperience::factory()->create(['title' => 'Other']);

    $this->get(route('website-edit.show', ['experience' => $other, 'k' => $this->order->approval_token]))->assertNotFound();

    $this->get($this->order->websiteEditUrl())->assertOk();

    $this->patch(route('account.experiences.content', $other), ['field' => 'title', 'value' => 'Hacked'])
        ->assertForbidden();
});
