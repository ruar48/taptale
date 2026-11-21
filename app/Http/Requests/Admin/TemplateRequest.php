<?php

namespace App\Http\Requests\Admin;

use App\Enums\TemplateLayout;
use App\Models\Template;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

class TemplateRequest extends FormRequest
{
    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'slug' => Str::slug((string) ($this->input('slug') ?: $this->input('name'))),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Template|null $template */
        $template = $this->route('template');
        $image = File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(6144);

        return [
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['required', 'string', 'max:140', Rule::unique('templates', 'slug')->ignore($template)],
            'description' => ['nullable', 'string', 'max:255'],
            'layout' => ['required', Rule::enum(TemplateLayout::class)],
            'palette' => ['required', 'array'],
            'palette.background' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'palette.ink' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'palette.accent' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'is_active' => ['boolean'],
            'is_featured' => ['boolean'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:10000'],
            'category_ids' => ['required', 'array', 'min:1'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
            'product_ids' => ['array'],
            'product_ids.*' => ['integer', 'exists:products,id'],
            'preview' => ['nullable', $image],
            'mockup' => ['nullable', $image],
            'remove_preview' => ['boolean'],
            'remove_mockup' => ['boolean'],
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
            'category_ids.required' => 'Assign the template to at least one category.',
        ];
    }

    /**
     * The attributes to persist on the template.
     *
     * @return array<string, mixed>
     */
    public function templateData(): array
    {
        $data = $this->safe()->except(['category_ids', 'product_ids', 'preview', 'mockup', 'remove_preview', 'remove_mockup']);
        $data['palette'] = [
            'background' => $data['palette']['background'],
            'ink' => $data['palette']['ink'],
            'accent' => $data['palette']['accent'],
        ];

        return $data;
    }
}
