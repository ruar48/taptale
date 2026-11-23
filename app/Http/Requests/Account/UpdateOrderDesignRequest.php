<?php

namespace App\Http\Requests\Account;

use App\Enums\OrderFileKind;
use App\Models\Order;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;
use Illuminate\Validation\Validator;

/**
 * The photos and details a customer adds to finish their design from the
 * order page. Every field is optional while saving; what the chosen design
 * needs is checked when they approve it or send it to the studio.
 */
class UpdateOrderDesignRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->order()) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'personalization' => ['array'],
            'personalization.names' => ['nullable', 'string', 'max:120'],
            'personalization.date' => ['nullable', 'string', 'max:60'],
            'personalization.message' => ['nullable', 'string', 'max:300'],
            'personalization.song_title' => ['nullable', 'string', 'max:80'],
            'personalization.artist' => ['nullable', 'string', 'max:80'],
            'personalization.color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'personalization.design_brief' => ['nullable', 'string', 'max:2000'],
            'personalization.instructions' => ['nullable', 'string', 'max:2000'],

            'photos' => ['array', 'max:'.$this->maxPhotos()],
            'photos.*' => [File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max((int) config('taptale.max_upload_kilobytes'))],
            'remove_photos' => ['array'],
            'remove_photos.*' => [
                'integer',
                Rule::exists('order_files', 'id')
                    ->where('order_id', $this->order()->id)
                    ->whereIn('kind', [OrderFileKind::Photo->value, OrderFileKind::Reference->value]),
            ],
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
                if ($validator->errors()->hasAny(['photos', 'remove_photos'])) {
                    return;
                }

                if ($this->photoCountAfterSaving() > $this->maxPhotos()) {
                    $validator->errors()->add('photos', 'Your design can have up to '.$this->maxPhotos().' photos. Remove one to add another.');
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
            'photos.max' => 'Your design can have up to :max photos.',
            'personalization.color.regex' => 'Please choose a valid color.',
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
            'photos.*' => 'photo',
            'personalization.names' => 'names',
            'personalization.date' => 'date',
            'personalization.message' => 'message',
            'personalization.song_title' => 'song title',
            'personalization.artist' => 'artist',
            'personalization.design_brief' => 'design brief',
            'personalization.instructions' => 'instructions',
        ];
    }

    /**
     * How many design photos the order will have once this request is saved.
     */
    public function photoCountAfterSaving(): int
    {
        $removing = array_map('intval', (array) $this->input('remove_photos', []));

        $kept = $this->order()->files()
            ->whereIn('kind', [OrderFileKind::Photo, OrderFileKind::Reference])
            ->whereNotIn('id', $removing)
            ->count();

        return $kept + count($this->file('photos', []));
    }

    /**
     * The order being designed.
     */
    public function order(): Order
    {
        return $this->route('order')->loadMissing(['product', 'template', 'latestProof']);
    }

    /**
     * Most photos the ordered product's design can hold.
     */
    private function maxPhotos(): int
    {
        return max(1, $this->order()->product?->max_photos ?? 3);
    }
}
