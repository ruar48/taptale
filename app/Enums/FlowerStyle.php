<?php

namespace App\Enums;

/**
 * The flowers on a "Flowers for you" page: the wrapped bouquet, or glowing
 * flowers in one color (or mixed) that grow in a night garden.
 */
enum FlowerStyle: string
{
    case Bouquet = 'bouquet';
    case Teal = 'teal';
    case Pink = 'pink';
    case Lavender = 'lavender';
    case Golden = 'golden';
    case Red = 'red';
    case White = 'white';
    case Blue = 'blue';
    case Peach = 'peach';
    case Mixed = 'mixed';
}
