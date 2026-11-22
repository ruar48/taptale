<?php

namespace App\Http\Resources;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Order
 */
class OrderResource extends JsonResource
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
            'reference' => $this->reference,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'status_tone' => $this->status->tone(),
            'stage' => $this->status->stage(),
            'design_mode' => $this->design_mode->value,
            'design_mode_label' => $this->design_mode->label(),
            'product_name' => $this->product_name,
            'product_slug' => $this->whenLoaded('product', fn (): ?string => $this->product?->slug),
            'product_art_style' => $this->whenLoaded('product', fn (): ?string => $this->product?->art_style),
            'category_name' => $this->whenLoaded('category', fn (): ?string => $this->category?->name),
            'template_name' => $this->template_name,
            'template' => $this->whenLoaded('template', fn (): ?TemplateResource => $this->template ? new TemplateResource($this->template) : null),
            'selected_options' => $this->selected_options,
            'personalization' => (object) $this->personalization,
            'preview_approved_at' => $this->preview_approved_at?->toIso8601String(),
            'quantity' => $this->quantity,
            'unit_price' => $this->unit_price,
            'subtotal' => $this->subtotal,
            'customization_fee' => $this->customization_fee,
            'delivery_fee' => $this->delivery_fee,
            'adjustment' => $this->adjustment,
            'adjustment_note' => $this->adjustment_note,
            'promo_code' => $this->promo_code,
            'discount' => $this->discount,
            'total' => $this->total,
            'amount_paid' => $this->whenLoaded('payments', fn (): int => $this->amountPaid()),
            'balance_due' => $this->whenLoaded('payments', fn (): int => $this->balanceDue()),
            'is_design_approved' => $this->when($this->resource->relationLoaded('latestProof'), fn (): bool => $this->isDesignApproved()),
            'can_cancel' => $this->status->isCancellableByCustomer()
                && (! $this->resource->relationLoaded('payments') || $this->amountPaid() === 0),
            'accepts_payment' => $this->status->acceptsPayment(),
            'customer_name' => $this->customer_name,
            'customer_email' => $this->customer_email,
            'customer_phone' => $this->customer_phone,
            'address_line' => $this->address_line,
            'city' => $this->city,
            'province' => $this->province,
            'postal_code' => $this->postal_code,
            'customer_notes' => $this->customer_notes,
            'is_gift' => $this->is_gift,
            'gift_message' => $this->gift_message,
            'courier' => $this->courier,
            'tracking_number' => $this->tracking_number,
            'tracking_url' => $this->tracking_url,
            'is_reviewable' => $this->isReviewable(),
            'review' => $this->whenLoaded('review', fn (): ?array => $this->review ? [
                'rating' => $this->review->rating,
                'quote' => $this->review->quote,
                'author_name' => $this->review->author_name,
                'is_published' => $this->review->is_published,
            ] : null),
            'payment_method' => $this->whenLoaded('paymentMethod', fn (): ?PaymentMethodResource => $this->paymentMethod ? new PaymentMethodResource($this->paymentMethod) : null),
            'files' => OrderFileResource::collection($this->whenLoaded('files')),
            'proofs' => DesignProofResource::collection($this->whenLoaded('proofs')),
            'activities' => OrderActivityResource::collection($this->whenLoaded('activities')),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
            'experience' => $this->whenLoaded('experience', fn (): ?DigitalExperienceResource => $this->experience ? new DigitalExperienceResource($this->experience) : null),
            'user' => $this->whenLoaded('user', fn (): array => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
