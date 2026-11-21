<?php

namespace App\Http\Resources;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Template;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Product
 */
class ProductResource extends JsonResource
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
            'name' => $this->name,
            'slug' => $this->slug,
            'short_description' => $this->short_description,
            'description' => $this->description,
            'art_style' => $this->art_style,
            'base_price' => $this->base_price,
            'design_fee' => $this->design_fee,
            'production_days_min' => $this->production_days_min,
            'production_days_max' => $this->production_days_max,
            'production_time' => $this->productionTimeLabel(),
            'min_quantity' => $this->min_quantity,
            'max_quantity' => $this->max_quantity,
            'max_photos' => $this->max_photos,
            'has_digital_experience' => $this->has_digital_experience,
            'is_active' => $this->is_active,
            'is_featured' => $this->is_featured,
            'is_bestseller' => $this->is_bestseller,
            'sort_order' => $this->sort_order,
            'cover_image_url' => $this->whenLoaded('images', fn (): ?string => $this->images->first()?->url),
            'images' => $this->whenLoaded('images', fn (): array => $this->images->map(fn (ProductImage $image): array => [
                'id' => $image->id,
                'url' => $image->url,
                'alt' => $image->alt,
            ])->all()),
            'options' => ProductOptionResource::collection($this->whenLoaded('options', fn () => $this->options)),
            'categories' => $this->whenLoaded('categories', fn (): array => $this->categories->map(fn (Category $category): array => [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
            ])->all()),
            'template_ids' => $this->whenLoaded('templates', fn (): array => $this->templates->map(fn (Template $template): int => $template->id)->all()),
            'orders_count' => $this->whenCounted('orders'),
        ];
    }
}
