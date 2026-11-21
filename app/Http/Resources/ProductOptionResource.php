<?php

namespace App\Http\Resources;

use App\Models\ProductOption;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProductOption
 */
class ProductOptionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'group' => $this->group->value,
            'group_label' => $this->group->label(),
            'multiple' => $this->group->allowsMultiple(),
            'name' => $this->name,
            'description' => $this->description,
            'price_modifier' => $this->price_modifier,
            'swatch' => $this->swatch,
            'enables_digital_experience' => $this->enables_digital_experience,
            'is_default' => $this->is_default,
            'is_active' => $this->is_active,
            'sort_order' => $this->sort_order,
        ];
    }
}
