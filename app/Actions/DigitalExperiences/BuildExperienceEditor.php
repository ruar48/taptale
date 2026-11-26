<?php

namespace App\Actions\DigitalExperiences;

use App\Enums\ExperienceTemplate;
use App\Http\Resources\DigitalExperienceResource;
use App\Models\DigitalExperience;
use App\Models\ExperienceReply;
use App\Models\ExperienceView;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Everything the website (memory page) editor needs, shared by the editor's
 * own page and the order page, where the customer edits it in place.
 */
class BuildExperienceEditor
{
    /**
     * @return array{
     *     experience: DigitalExperienceResource,
     *     order: array{reference: string, product_name: string},
     *     adminEditing: array{customer_name: string}|null,
     *     stats: array{views: int, hearts: int, views_this_week: int, recent_views: mixed},
     *     replies: mixed,
     *     templates: mixed,
     *     isTemplateLocked: bool,
     *     themes: list<string>,
     *     maxPhotos: int,
     *     maxMoments: int,
     *     maxUploadKilobytes: int
     * }
     */
    public function handle(DigitalExperience $experience, ?User $viewer): array
    {
        $experience->loadMissing([
            'order:id,reference,product_name,status,customer_name',
            'replies' => fn (HasMany $query) => $query->limit(50),
        ]);

        $isAdminEditing = $viewer !== null && $experience->user_id !== $viewer->id;

        return [
            'experience' => new DigitalExperienceResource($experience),
            'order' => [
                'reference' => $experience->order->reference,
                'product_name' => $experience->order->product_name,
            ],
            'adminEditing' => $isAdminEditing ? ['customer_name' => $experience->order->customer_name] : null,
            'stats' => [
                'views' => $experience->view_count,
                'hearts' => $experience->heart_count,
                'views_this_week' => $experience->views()->where('created_at', '>=', now()->subDays(7))->count(),
                'recent_views' => $experience->views()->latest()->latest('id')->limit(8)->get(['id', 'device', 'created_at'])
                    ->map(fn (ExperienceView $view): array => [
                        'id' => $view->id,
                        'device' => $view->device,
                        'created_at' => $view->created_at->toIso8601String(),
                    ]),
            ],
            'replies' => $experience->replies->map(fn (ExperienceReply $reply): array => [
                'id' => $reply->id,
                'name' => $reply->name,
                'message' => $reply->message,
                'created_at' => $reply->created_at?->toIso8601String(),
            ]),
            'templates' => ExperienceTemplate::options(),
            'isTemplateLocked' => $experience->isTemplateLocked(),
            'themes' => DigitalExperience::THEMES,
            'maxPhotos' => DigitalExperience::MAX_PHOTOS,
            'maxMoments' => DigitalExperience::MAX_MOMENTS,
            'maxUploadKilobytes' => (int) config('taptale.max_upload_kilobytes'),
        ];
    }
}
