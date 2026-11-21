<?php

namespace App\Models;

use App\Enums\OptionGroup;
use Database\Factories\ProductOptionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $product_id
 * @property OptionGroup $group
 * @property string $name
 * @property string|null $description
 * @property int $price_modifier
 * @property string|null $swatch
 * @property bool $enables_digital_experience
 * @property bool $is_default
 * @property bool $is_active
 * @property int $sort_order
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'group', 'name', 'description', 'price_modifier', 'swatch',
    'enables_digital_experience', 'is_default', 'is_active', 'sort_order',
])]
class ProductOption extends Model
{
    /** @use HasFactory<ProductOptionFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'group' => OptionGroup::class,
            'price_modifier' => 'integer',
            'enables_digital_experience' => 'boolean',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
