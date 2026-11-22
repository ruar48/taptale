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
        $photoUrl = fn (int $index): string => route('experiences.photo', ['experience' => $this->code, 'index' => $index]);
        $photoCount = count($this->photos ?? []);

        return [
            'code' => $this->code,
            'template' => $this->template->value,
            'theme' => $this->theme,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'recipient_name' => $this->recipient_name,
            'sender_name' => $this->sender_name,
            'message' => $this->message,
            'quote' => $this->quote,
            'flowers_note' => $this->flowers_note,
            'photo_rain_layer' => $this->photo_rain_layer->value,
            'event_date' => $this->event_date,
            'video_url' => $this->video_url,
            'music_url' => $this->music_url,
            'song_title' => $this->song_title,
            'song_artist' => $this->song_artist,
            'audio_url' => $this->audio_path !== null ? route('experiences.audio', $this->resource) : null,
            'photos' => collect($this->photos ?? [])->keys()->map(fn (int $index): array => [
                'index' => $index,
                'url' => $photoUrl($index),
            ])->all(),
            'moments' => collect($this->moments ?? [])->map(fn (array $moment): array => [
                'date' => $moment['date'] ?? null,
                'title' => $moment['title'] ?? null,
                'caption' => $moment['caption'] ?? null,
                'photo' => $moment['photo'] ?? null,
                'photo_url' => isset($moment['photo']) && $moment['photo'] < $photoCount ? $photoUrl((int) $moment['photo']) : null,
            ])->all(),
            'nfc_tag_uid' => $this->nfc_tag_uid,
            'is_published' => $this->is_published,
            'view_count' => $this->view_count,
            'public_url' => $this->publicUrl(),
            'qr_url' => route('experiences.qr', $this->resource),
        ];
    }
}
