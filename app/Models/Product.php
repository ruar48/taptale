<?php

namespace App\Models;

use App\Enums\TemplateLayout;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\RouteKey;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $short_description
 * @property string|null $description
 * @property string $art_style
 * @property int $base_price
 * @property int $design_fee
 * @property int $production_days_min
 * @property int $production_days_max
 * @property int $min_quantity
 * @property int $max_quantity
 * @property int $max_photos
 * @property bool $has_digital_experience
 * @property bool $is_active
 * @property bool $is_featured
 * @property bool $is_bestseller
 * @property int $sort_order
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[RouteKey('slug')]
#[Fillable([
    'name', 'slug', 'short_description', 'description', 'art_style', 'base_price', 'design_fee',
    'production_days_min', 'production_days_max', 'min_quantity', 'max_quantity', 'max_photos',
    'has_digital_experience', 'is_active', 'is_featured', 'is_bestseller', 'sort_order',
])]
class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory;

    /**
     * Visual styles the storefront can illustrate when no photo is uploaded.
     *
     * @var list<string>
     */
    public const ART_STYLES = ['acrylic', 'nfc', 'qr', 'photo', 'keepsake', 'cd', 'music', 'strip', 'tag', 'wood', 'diecut', 'calendar'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'base_price' => 'integer',
            'design_fee' => 'integer',
            'production_days_min' => 'integer',
            'production_days_max' => 'integer',
            'min_quantity' => 'integer',
            'max_quantity' => 'integer',
            'max_photos' => 'integer',
            'has_digital_experience' => 'boolean',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'is_bestseller' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * The design the product is made in. The product itself is the design,
     * so its art style decides how the customer's photos and words are laid
     * out on it.
     */
    public function designLayout(): TemplateLayout
    {
        return match ($this->art_style) {
            'cd' => TemplateLayout::MiniCd,
            'music' => TemplateLayout::MusicPlayer,
            'strip' => TemplateLayout::PhotoStrip,
            'tag' => TemplateLayout::TapTag,
            'wood' => TemplateLayout::Engraved,
            'diecut' => TemplateLayout::DieCut,
            'calendar' => TemplateLayout::Calendar,
            default => TemplateLayout::Polaroid,
        };
    }

    /**
     * @return BelongsToMany<Category, $this>
     */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class);
    }

    /**
     * @return HasMany<ProductImage, $this>
     */
    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order')->orderBy('id');
    }

    /**
     * @return HasMany<ProductOption, $this>
     */
    public function options(): HasMany
    {
        return $this->hasMany(ProductOption::class)->orderBy('sort_order')->orderBy('id');
    }

    /**
     * @return HasMany<ProductOption, $this>
     */
    public function activeOptions(): HasMany
    {
        return $this->options()->where('is_active', true);
    }

    /**
     * @return HasMany<Order, $this>
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /**
     * Only products visible on the storefront, in display order.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function active(Builder $query): void
    {
        $query->where('is_active', true)->orderBy('sort_order')->orderBy('id');
    }

    /**
     * Human friendly production time, e.g. "3–5 business days".
     */
    public function productionTimeLabel(): string
    {
        if ($this->production_days_min === $this->production_days_max) {
            return "{$this->production_days_min} business days";
        }

        return "{$this->production_days_min}–{$this->production_days_max} business days";
    }
}
