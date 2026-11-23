<?php

namespace App\Http\Requests\Account;

use App\Enums\ExperienceTemplate;
use App\Enums\FlowerRain;
use App\Enums\FlowerStyle;
use App\Enums\PhotoRainLayer;
use App\Models\DigitalExperience;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;
use Illuminate\Validation\Validator;

class UpdateExperienceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->experience()) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'template' => ['required', Rule::enum(ExperienceTemplate::class)],
            'theme' => ['required', Rule::in(DigitalExperience::THEMES)],
            'title' => ['required', 'string', 'max:120'],
            'subtitle' => ['nullable', 'string', 'max:160'],
            'recipient_name' => ['nullable', 'string', 'max:80'],
            'sender_name' => ['nullable', 'string', 'max:80'],
            'message' => ['nullable', 'string', 'max:5000'],
            'quote' => ['nullable', 'string', 'max:255'],
            'flowers_note' => ['nullable', 'string', 'max:500'],
            'flower_style' => [Rule::excludeIf(! $this->showsFlowers()), 'sometimes', Rule::enum(FlowerStyle::class)],
            'flower_rain' => [Rule::excludeIf(! $this->showsFlowers()), 'sometimes', Rule::enum(FlowerRain::class)],
            'photo_rain_layer' => [Rule::excludeIf(! $this->showsFlowers()), 'sometimes', Rule::enum(PhotoRainLayer::class)],
            'event_date' => ['nullable', 'string', 'max:60'],
            'video_url' => ['nullable', 'url:https', 'max:500'],
            'music_url' => ['nullable', 'url:https', 'max:500'],
            'song_title' => ['nullable', 'string', 'max:120'],
            'song_artist' => ['nullable', 'string', 'max:120'],
            'is_published' => ['boolean'],
            'unlocks_at' => ['nullable', 'date'],

            'moments' => ['array', 'max:'.DigitalExperience::MAX_MOMENTS],
            'moments.*.date' => ['nullable', 'string', 'max:60'],
            'moments.*.title' => ['nullable', 'string', 'max:80'],
            'moments.*.caption' => ['nullable', 'string', 'max:300'],
            'moments.*.photo' => ['nullable', 'integer', 'min:0'],

            'new_photos' => ['array', 'max:'.DigitalExperience::MAX_PHOTOS],
            'new_photos.*' => [File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max((int) config('taptale.max_upload_kilobytes'))],
            'remove_photos' => ['array'],
            'remove_photos.*' => ['integer', 'min:0'],

            'audio' => ['nullable', File::types(['mp3', 'm4a', 'aac', 'ogg', 'wav'])->max(15360)],
            'remove_audio' => ['boolean'],
        ];
    }

    /**
     * Get the "after" validation callables for the request.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $experience = $this->experience();

                if ($this->input('template') !== $experience->template->value && $experience->isTemplateLocked()) {
                    $validator->errors()->add('template', 'Your keepsake has been released, so its page design can no longer be changed.');
                }
            },
            function (Validator $validator): void {
                $current = count($this->experience()->photos ?? []);
                $removing = count(array_unique((array) $this->input('remove_photos', [])));
                $adding = count((array) $this->file('new_photos', []));

                if ($current - $removing + $adding > DigitalExperience::MAX_PHOTOS) {
                    $validator->errors()->add('new_photos', 'Your page can have at most '.DigitalExperience::MAX_PHOTOS.' photos.');
                }
            },
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'moments.max' => 'You can add up to :max moments.',
            'audio.max' => 'The song file may not be larger than 15 MB.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'new_photos.*' => 'photo',
            'video_url' => 'video link',
            'music_url' => 'song link',
            'audio' => 'song file',
            'moments.*.caption' => 'moment caption',
            'moments.*.title' => 'moment title',
            'moments.*.date' => 'moment date',
        ];
    }

    private function experience(): DigitalExperience
    {
        /** @var DigitalExperience $experience */
        $experience = $this->route('experience');

        return $experience;
    }

    /**
     * Whether the page will show the flowers with the submitted design: the
     * bouquet design includes them, other designs only with the add-on
     * bought at checkout. Flower choices are ignored otherwise.
     */
    private function showsFlowers(): bool
    {
        return $this->input('template') === ExperienceTemplate::DigitalBouquet->value
            || $this->experience()->flower_addon;
    }
}
