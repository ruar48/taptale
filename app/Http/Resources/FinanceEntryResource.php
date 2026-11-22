<?php

namespace App\Http\Resources;

use App\Models\FinanceEntry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin FinanceEntry
 */
class FinanceEntryResource extends JsonResource
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
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'category' => $this->category?->value,
            'category_label' => $this->category?->label(),
            'amount' => $this->amount,
            'description' => $this->description,
            'occurred_on' => $this->occurred_on->toDateString(),
            'notes' => $this->notes,
            'recorded_by' => $this->whenLoaded('recorder', fn () => $this->recorder?->name),
        ];
    }
}
