<?php

namespace App\Actions\DigitalExperiences;

use BaconQrCode\Renderer\Color\Rgb;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\Fill;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

/**
 * Renders a QR code as SVG using the bacon/bacon-qr-code library that
 * already ships with Laravel Fortify.
 */
class RenderQrCode
{
    public function handle(string $content, int $size = 320): string
    {
        $svg = (new Writer(
            new ImageRenderer(
                new RendererStyle($size, 1, null, null, Fill::uniformColor(new Rgb(255, 255, 255), new Rgb(52, 48, 57))),
                new SvgImageBackEnd,
            )
        ))->writeString($content);

        return trim(substr($svg, strpos($svg, "\n") + 1));
    }
}
