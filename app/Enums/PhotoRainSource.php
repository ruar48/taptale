<?php

namespace App\Enums;

/**
 * Which photos rain over a flower page: only the ones added to the rain, or
 * those together with all of the page's other photos.
 */
enum PhotoRainSource: string
{
    case Picked = 'picked';
    case All = 'all';
}
