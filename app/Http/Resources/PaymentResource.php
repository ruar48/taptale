<?php

namespace App\Http\Resources;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Payment
 */
class PaymentResource extends JsonResource
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
            'kind' => $this->kind->value,
            'kind_label' => $this->kind->label(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'amount' => $this->amount,
            'reference_number' => $this->reference_number,
            'notes' => $this->notes,
            'method' => $this->whenLoaded('method', fn (): ?string => $this->method?->name),
            'proof_url' => $this->proof_path !== null ? route('files.payment', $this->resource) : null,
            'review_notes' => $this->review_notes,
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'order' => $this->whenLoaded('order', fn (): array => [
                'reference' => $this->order->reference,
                'customer_name' => $this->order->customer_name,
                'total' => $this->order->total,
                'status_label' => $this->order->status->label(),
            ]),
        ];
    }
}
