<?php

namespace App\Http\Resources;

use App\Models\OrderActivity;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin OrderActivity
 */
class OrderActivityResource extends JsonResource
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
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'body' => $this->body,
            'is_internal' => $this->is_internal,
            'author' => $this->whenLoaded('user', fn (): ?string => $this->user?->name),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
