<?php

namespace App\Http\Requests\Account;

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
            'title' => ['required', 'string', 'max:120'],
            'subtitle' => ['nullable', 'string', 'max:160'],
            'message' => ['nullable', 'string', 'max:3000'],
            'event_date' => ['nullable', 'string', 'max:60'],
            'video_url' => ['nullable', 'url:https', 'max:500'],
            'music_url' => ['nullable', 'url:https', 'max:500'],
            'theme' => ['required', Rule::in(DigitalExperience::THEMES)],
            'is_published' => ['boolean'],
            'new_photos' => ['array', 'max:'.DigitalExperience::MAX_PHOTOS],
            'new_photos.*' => [File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max((int) config('taptale.max_upload_kilobytes'))],
            'remove_photos' => ['array'],
            'remove_photos.*' => ['integer', 'min:0'],
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
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'new_photos.*' => 'photo',
            'video_url' => 'video link',
            'music_url' => 'music link',
        ];
    }

    private function experience(): DigitalExperience
    {
        /** @var DigitalExperience $experience */
        $experience = $this->route('experience');

        return $experience;
    }
}
