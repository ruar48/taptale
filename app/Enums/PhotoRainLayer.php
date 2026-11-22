<?php

namespace App\Enums;

/**
 * Whether the photos raining over a night garden page fall in front of the
 * flowers or behind them.
 */
enum PhotoRainLayer: string
{
    case Front = 'front';
    case Back = 'back';
}
