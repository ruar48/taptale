<?php

namespace App\Http\Resources;

use App\Models\Category;
use App\Models\Product;
use App\Models\Template;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Template
 */
class TemplateResource extends JsonResource
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
            'description' => $this->description,
            'layout' => $this->layout->value,
            'layout_label' => $this->layout->label(),
            'palette' => $this->palette,
            'preview_url' => $this->preview_url,
            'mockup_url' => $this->mockup_url,
            'is_active' => $this->is_active,
            'is_featured' => $this->is_featured,
            'sort_order' => $this->sort_order,
            'categories' => $this->whenLoaded('categories', fn (): array => $this->categories->map(fn (Category $category): array => [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
            ])->all()),
            'product_ids' => $this->whenLoaded('products', fn (): array => $this->products->map(fn (Product $product): int => $product->id)->all()),
        ];
    }
}
