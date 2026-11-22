<?php

namespace App\Actions\DigitalExperiences;

use App\Models\DigitalExperience;
use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Stores a memory page photo after re-encoding it with GD.
 *
 * Phone photos carry EXIF metadata, often including the GPS position where
 * they were taken. Memory pages are opened by other people, so the photo is
 * redrawn into a fresh image (which keeps no metadata), turned upright using
 * its EXIF orientation, and scaled down to a size that suits a phone screen.
 */
class StoreExperiencePhoto
{
    /**
     * Longest side, in pixels, of a stored photo.
     */
    public const MAX_DIMENSION = 2560;

    /**
     * Largest source image accepted, in pixels (50 MP). Decoding needs about
     * four bytes per pixel, so a tiny file that claims huge dimensions (a
     * "decompression bomb") is refused before it can exhaust memory.
     */
    public const MAX_SOURCE_PIXELS = 50_000_000;

    /**
     * Store several photos, or none: if one cannot be read, the ones already
     * stored are removed and the customer is told which upload to change.
     *
     * @param  array<int, UploadedFile>  $photos
     * @return list<string>
     *
     * @throws ValidationException
     */
    public function handleMany(DigitalExperience $experience, array $photos, string $errorKey): array
    {
        $paths = [];

        foreach (array_values($photos) as $position => $photo) {
            $path = $this->handle($experience, $photo);

            if ($path === false) {
                Storage::disk((string) config('taptale.uploads_disk'))->delete($paths);

                throw ValidationException::withMessages([
                    $errorKey => count($photos) > 1
                        ? 'Photo '.($position + 1).' ("'.Str::limit($photo->getClientOriginalName(), 40).'") could not be read. Please choose a different JPG, PNG or WebP photo.'
                        : 'This photo could not be read. Please choose a different JPG, PNG or WebP photo.',
                ]);
            }

            $paths[] = $path;
        }

        return $paths;
    }

    /**
     * @return string|false The stored path, or false when the image could not be read.
     */
    public function handle(DigitalExperience $experience, UploadedFile $photo): string|false
    {
        $mimeType = (string) $photo->getMimeType();

        if (! in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp'], true)) {
            return false;
        }

        $size = @getimagesize($photo->getRealPath());

        if ($size === false || $size[0] < 1 || $size[1] < 1 || $size[0] * $size[1] > self::MAX_SOURCE_PIXELS) {
            return false;
        }

        $this->raiseMemoryLimit();

        $image = @imagecreatefromstring((string) file_get_contents($photo->getRealPath()));

        if (! $image instanceof GdImage) {
            return false;
        }

        if ($mimeType === 'image/jpeg') {
            $image = $this->orientUpright($image, $photo->getRealPath());
        }

        $image = $this->scaleDown($image);
        $contents = $this->encode($image, $mimeType);

        if ($contents === '') {
            return false;
        }

        $disk = (string) config('taptale.uploads_disk');
        $path = $photo->hashName("experiences/{$experience->id}");

        return Storage::disk($disk)->put($path, $contents) ? $path : false;
    }

    /**
     * Apply the EXIF orientation, since the stripped copy loses that flag.
     */
    private function orientUpright(GdImage $image, string $path): GdImage
    {
        $exif = function_exists('exif_read_data') ? @exif_read_data($path) : false;
        $orientation = is_array($exif) ? (int) ($exif['Orientation'] ?? 1) : 1;

        if (in_array($orientation, [2, 5, 7], true)) {
            imageflip($image, IMG_FLIP_HORIZONTAL);
        }

        if ($orientation === 4) {
            imageflip($image, IMG_FLIP_VERTICAL);
        }

        $angle = match ($orientation) {
            3 => 180,
            6, 7 => 270,
            5, 8 => 90,
            default => 0,
        };

        if ($angle === 0) {
            return $image;
        }

        $rotated = imagerotate($image, $angle, 0);

        return $rotated instanceof GdImage ? $rotated : $image;
    }

    private function scaleDown(GdImage $image): GdImage
    {
        $width = imagesx($image);
        $height = imagesy($image);
        $longest = max($width, $height);

        if ($longest <= self::MAX_DIMENSION) {
            return $image;
        }

        $ratio = self::MAX_DIMENSION / $longest;
        $scaled = imagescale($image, max(1, (int) round($width * $ratio)), max(1, (int) round($height * $ratio)));

        return $scaled instanceof GdImage ? $scaled : $image;
    }

    private function encode(GdImage $image, string $mimeType): string
    {
        ob_start();

        match ($mimeType) {
            'image/png' => (function () use ($image): void {
                imagealphablending($image, false);
                imagesavealpha($image, true);
                imagepng($image, null, 6);
            })(),
            'image/webp' => imagewebp($image, null, 85),
            default => imagejpeg($image, null, 85),
        };

        return (string) ob_get_clean();
    }

    /**
     * A 48-megapixel photo needs about 200 MB once decoded, and redrawing
     * one can take a few seconds on shared hosting, so each photo gets a
     * fresh time allowance (ten big photos in one upload would otherwise
     * run past PHP's 30 second limit).
     */
    private function raiseMemoryLimit(): void
    {
        @set_time_limit(60);

        $limit = (string) ini_get('memory_limit');

        if ($limit !== '-1' && $this->toBytes($limit) < 512 * 1024 * 1024) {
            @ini_set('memory_limit', '512M');
        }
    }

    private function toBytes(string $value): int
    {
        $number = (int) $value;

        return match (strtolower(substr(trim($value), -1))) {
            'g' => $number * 1024 ** 3,
            'm' => $number * 1024 ** 2,
            'k' => $number * 1024,
            default => $number,
        };
    }
}
