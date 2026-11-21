<?php

namespace App\Http\Resources;

use App\Models\DigitalExperience;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin DigitalExperience
 */
class DigitalExperienceResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'code' => $this->code,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'message' => $this->message,
            'event_date' => $this->event_date,
            'video_url' => $this->video_url,
            'music_url' => $this->music_url,
            'theme' => $this->theme,
            'photos' => collect($this->photos ?? [])->keys()->map(fn (int $index): array => [
                'index' => $index,
                'url' => route('experiences.photo', ['experience' => $this->code, 'index' => $index]),
            ])->all(),
            'nfc_tag_uid' => $this->nfc_tag_uid,
            'is_published' => $this->is_published,
            'view_count' => $this->view_count,
            'public_url' => $this->publicUrl(),
            'qr_url' => route('experiences.qr', $this->resource),
        ];
    }
}
