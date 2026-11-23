<?php

namespace App\Enums;

/**
 * The flowers on a "Flowers for you" page: the wrapped bouquet, a glowing
 * lotus, a heart-shaped bouquet, a single crimson blossom, or glowing
 * flowers in one color (or mixed) that grow in a night garden.
 */
enum FlowerStyle: string
{
    case Bouquet = 'bouquet';
    case Lotus = 'lotus';
    case Heart = 'heart';
    case Crimson = 'crimson';
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
