<?php

use App\Models\DigitalExperience;
use App\Notifications\MemoryPageReplied;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

test('the recipient sends one heart per session', function () {
    $experience = DigitalExperience::factory()->create();
    tapTag($experience);

    $this->post(route('experiences.heart', $experience))->assertRedirect();
    $this->post(route('experiences.heart', $experience))->assertRedirect();

    expect($experience->fresh()->heart_count)->toBe(1);

    $this->get(route('experiences.show', $experience))
        ->assertInertia(fn (Assert $page) => $page->where('hasHearted', true));
});

test('the recipient writes back and the owner is emailed', function () {
    Notification::fake();
    $experience = DigitalExperience::factory()->create();
    tapTag($experience);

    $this->post(route('experiences.replies.store', $experience), ['name' => 'Ana', 'message' => 'I love it, thank you!'])
        ->assertSessionHasNoErrors();

    $reply = $experience->replies()->sole();

    expect($reply)
        ->name->toBe('Ana')
        ->message->toBe('I love it, thank you!');

    Notification::assertSentTo($experience->user, MemoryPageReplied::class, fn (MemoryPageReplied $notification) => $notification->reply->is($reply));
});

test('a reply needs a message', function () {
    $experience = DigitalExperience::factory()->create();
    tapTag($experience);

    $this->post(route('experiences.replies.store', $experience), ['message' => ''])
        ->assertSessionHasErrors(['message' => 'Please write a short message.']);
});

test('reactions need the page to be opened from its tag first', function () {
    $experience = DigitalExperience::factory()->create();

    $this->post(route('experiences.heart', $experience))->assertNotFound();
    $this->post(route('experiences.replies.store', $experience), ['message' => 'Hi'])->assertNotFound();

    expect($experience->fresh()->heart_count)->toBe(0)
        ->and($experience->replies()->count())->toBe(0);
});

test('the owner cannot react to their own page', function () {
    $experience = DigitalExperience::factory()->create();

    $this->actingAs($experience->user)
        ->post(route('experiences.heart', $experience))
        ->assertForbidden();
});

test('the owner sees taps, hearts and replies in the editor', function () {
    $experience = DigitalExperience::factory()->create(['heart_count' => 2]);
    $experience->replies()->create(['name' => 'Leo', 'message' => 'Thank you!']);
    tapTag($experience);

    $this->actingAs($experience->user)
        ->get(route('account.experiences.edit', $experience))
        ->assertInertia(fn (Assert $page) => $page
            ->where('stats.views', 1)
            ->where('stats.views_this_week', 1)
            ->where('stats.hearts', 2)
            ->has('stats.recent_views', 1)
            ->where('replies.0.message', 'Thank you!'));
});

test('the owner schedules when the page opens', function () {
    $experience = DigitalExperience::factory()->create();

    $this->actingAs($experience->user)
        ->put(route('account.experiences.update', $experience), [
            'template' => 'classic',
            'title' => 'Happy birthday',
            'theme' => 'blush',
            'unlocks_at' => '2026-12-25T00:00:00.000Z',
        ])
        ->assertSessionHasNoErrors();

    expect($experience->fresh()->unlocks_at->toIso8601String())->toBe('2026-12-25T00:00:00+00:00');
});
