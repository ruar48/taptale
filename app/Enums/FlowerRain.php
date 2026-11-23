<?php

namespace App\Enums;

/**
 * What falls from the sky over the flowers on a "Flowers for you" page.
 */
enum FlowerRain: string
{
    case None = 'none';
    case Petals = 'petals';
    case Photos = 'photos';
    case Both = 'both';
}
