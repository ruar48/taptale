<?php

use App\Enums\ExperienceTemplate;
use App\Models\DigitalExperience;
use App\Models\Order;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Every keychain now comes with its own website (the NFC memory page) at no
 * extra cost, so the paid "Add NFC" upgrade is retired. The NFC options are
 * deactivated rather than deleted, so past orders keep their option names,
 * and open keychain orders placed without the upgrade get their website now.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $keychainIds = DB::table('products')
            ->where('name', 'like', '%keychain%')
            ->pluck('id');

        if ($keychainIds->isEmpty()) {
            return;
        }

        DB::table('products')
            ->whereIn('id', $keychainIds)
            ->update(['has_digital_experience' => true, 'updated_at' => now()]);

        DB::table('product_options')
            ->whereIn('product_id', $keychainIds)
            ->where(fn ($query) => $query->where('group', 'nfc')->orWhere('enables_digital_experience', true))
            ->update(['is_active' => false, 'updated_at' => now()]);

        Order::query()
            ->with(['category:id,slug', 'product:id,name'])
            ->whereIn('product_id', $keychainIds)
            ->whereDoesntHave('experience')
            ->each(function (Order $order): void {
                if (! $order->status->isOpen() || $order->user_id === null) {
                    return;
                }

                $template = ExperienceTemplate::forCategory($order->category?->slug);
                $details = $order->personalization ?? [];

                $experience = new DigitalExperience([
                    'template' => $template,
                    'theme' => $template->defaultTheme(),
                    'flower_addon' => false,
                    'title' => $details['names'] ?? $order->product_name,
                    'song_title' => $details['song_title'] ?? null,
                    'song_artist' => $details['artist'] ?? null,
                    'message' => $details['message'] ?? null,
                    'event_date' => $details['date'] ?? null,
                    'photos' => [],
                ]);
                $experience->user()->associate($order->user_id);
                $order->experience()->save($experience);
            });
    }

    /**
     * Reverse the migrations. Which products sold the upgrade before is not
     * known, so the options stay off; turn them back on from Admin → Products.
     */
    public function down(): void
    {
        //
    }
};
