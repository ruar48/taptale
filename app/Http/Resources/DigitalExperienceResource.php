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

        /*
         * The tap link and QR code carry the access key, and the counters are
         * private, so only the owner and admins receive them. A recipient
         * never sees a URL they could pass on.
         */
        $canManage = $request->user()?->can('view', $this->resource) ?? false;

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
            'flower_style' => $this->flower_style->value,
            'flower_rain' => $this->flower_rain->value,
            'flower_addon' => $this->flower_addon,
            'photo_rain_layer' => $this->photo_rain_layer->value,
            'event_date' => $this->event_date,
            'video_url' => $this->video_url,
            'video_file_url' => $this->video_path !== null ? route('experiences.video', $this->resource) : null,
            'video_frame' => $this->video_frame,
            'video_background' => $this->video_background,
            'music_url' => $this->music_url,
            'song_title' => $this->song_title,
            'song_artist' => $this->song_artist,
            'song_details' => $this->song_details,
            'song_ornament' => $this->song_ornament,
            'song_background' => $this->song_background,
            'audio_url' => $this->audio_path !== null ? route('experiences.audio', $this->resource) : null,
            'photos' => collect($this->photos ?? [])->keys()->map(fn (int $index): array => [
                'index' => $index,
                'url' => $photoUrl($index),
            ])->all(),
            'rain_photos' => collect($this->rain_photos ?? [])->keys()->map(fn (int $index): array => [
                'index' => $index,
                'url' => route('experiences.rain-photo', ['experience' => $this->code, 'index' => $index]),
            ])->all(),
            'moments' => collect($this->moments ?? [])->map(fn (array $moment): array => [
                'date' => $moment['date'] ?? null,
                'title' => $moment['title'] ?? null,
                'caption' => $moment['caption'] ?? null,
                'photo' => $moment['photo'] ?? null,
                'photo_url' => isset($moment['photo']) && $moment['photo'] < $photoCount ? $photoUrl((int) $moment['photo']) : null,
            ])->all(),
            'custom_sections' => collect($this->custom_sections ?? [])->map(fn (array $section): array => [
                'id' => $section['id'],
                'type' => $section['type'],
                'position' => $section['position'],
                'title' => $section['title'] ?? null,
                'text' => $section['text'] ?? null,
                'background' => $section['background'] ?? null,
                'slots' => collect($section['slots'] ?? [])->map(fn (array $slot): array => [
                    'photo' => $slot['photo'] ?? null,
                    'photo_url' => isset($slot['photo']) && $slot['photo'] < $photoCount ? $photoUrl((int) $slot['photo']) : null,
                    'caption' => $slot['caption'] ?? null,
                ])->all(),
            ])->all(),
            'nfc_tag_uid' => $canManage ? $this->nfc_tag_uid : null,
            'is_published' => $this->is_published,
            'unlocks_at' => $canManage ? $this->unlocks_at?->toIso8601String() : null,
            'view_count' => $canManage ? $this->view_count : null,
            'heart_count' => $canManage ? $this->heart_count : null,
            'public_url' => $canManage ? $this->publicUrl() : null,
            'qr_url' => $canManage ? route('experiences.qr', $this->resource) : null,
        ];
    }
}
