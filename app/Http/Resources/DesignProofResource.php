<?php

namespace App\Http\Resources;

use App\Models\DesignProof;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin DesignProof
 */
class DesignProofResource extends JsonResource
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
            'version' => $this->version,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'designer_notes' => $this->designer_notes,
            'customer_comment' => $this->customer_comment,
            'responded_at' => $this->responded_at?->toIso8601String(),
            'auto_approves_at' => $this->autoApprovesAt()?->toIso8601String(),
            'image_url' => route('files.proof', $this->resource),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
