<?php

namespace App\Models;

use App\Concerns\ResolvesMediaUrls;
use App\Enums\TemplateLayout;
use Database\Factories\TemplateFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\RouteKey;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property TemplateLayout $layout
 * @property array{background: string, ink: string, accent: string} $palette
 * @property string|null $preview_path
 * @property string|null $mockup_path
 * @property bool $is_active
 * @property bool $is_featured
 * @property int $sort_order
 * @property-read string|null $preview_url
 * @property-read string|null $mockup_url
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[RouteKey('slug')]
#[Fillable(['name', 'slug', 'description', 'layout', 'palette', 'preview_path', 'mockup_path', 'is_active', 'is_featured', 'sort_order'])]
class Template extends Model
{
    /** @use HasFactory<TemplateFactory> */
    use HasFactory, ResolvesMediaUrls;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'layout' => TemplateLayout::class,
            'palette' => 'array',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsToMany<Category, $this>
     */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class);
    }

    /**
     * @return BelongsToMany<Product, $this>
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class);
    }

    /**
     * Only templates visible on the storefront, in display order.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function active(Builder $query): void
    {
        $query->where('is_active', true)->orderBy('sort_order')->orderBy('id');
    }

    /**
     * Templates usable for the given product, optionally narrowed to one
     * category. Without a category, any of the product's categories match.
     * A template with no product restrictions is available to every product
     * in its categories.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function availableFor(Builder $query, ?Category $category, Product $product): void
    {
        $query
            ->whereHas('categories', fn (Builder $categories) => $category !== null
                ? $categories->whereKey($category->id)
                : $categories->whereHas('products', fn (Builder $products) => $products->whereKey($product->id)))
            ->where(fn (Builder $scoped) => $scoped
                ->whereDoesntHave('products')
                ->orWhereHas('products', fn (Builder $products) => $products->whereKey($product->id)));
    }

    /**
     * @return Attribute<string|null, never>
     */
    protected function previewUrl(): Attribute
    {
        return Attribute::get(fn (): ?string => $this->mediaUrl($this->preview_path));
    }

    /**
     * @return Attribute<string|null, never>
     */
    protected function mockupUrl(): Attribute
    {
        return Attribute::get(fn (): ?string => $this->mediaUrl($this->mockup_path));
    }
}
