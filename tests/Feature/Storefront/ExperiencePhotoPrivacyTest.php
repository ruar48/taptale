<?php

use App\Actions\DigitalExperiences\StoreExperiencePhoto;
use App\Models\DigitalExperience;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
});

/**
 * A real JPEG carrying an EXIF block with a recognizable marker, standing in
 * for the GPS position a phone camera writes into every photo.
 */
function jpegWithExif(int $width = 40, int $height = 30): UploadedFile
{
    $image = imagecreatetruecolor($width, $height);
    ob_start();
    imagejpeg($image);
    $jpeg = (string) ob_get_clean();

    $exif = "Exif\0\0II*\0\x08\0\0\0\0\0GPS-SECRET-LOCATION";
    $segment = "\xFF\xE1".pack('n', strlen($exif) + 2).$exif;
    $path = tempnam(sys_get_temp_dir(), 'exif').'.jpg';
    file_put_contents($path, substr($jpeg, 0, 2).$segment.substr($jpeg, 2));

    return new UploadedFile($path, 'IMG_0001.jpg', 'image/jpeg', null, true);
}

test('photos added to a memory page lose their metadata', function () {
    $experience = DigitalExperience::factory()->create(['photos' => []]);
    $photo = jpegWithExif();

    expect((string) file_get_contents($photo->getRealPath()))->toContain('GPS-SECRET-LOCATION');

    $this->actingAs($experience->user)
        ->post(route('account.experiences.photos.store', $experience), ['photos' => [$photo]])
        ->assertSessionHasNoErrors();

    $stored = Storage::disk('local')->get($experience->fresh()->photos[0]);

    expect($stored)
        ->not->toContain('GPS-SECRET-LOCATION')
        ->not->toContain('Exif')
        ->and(getimagesizefromstring($stored)[2])->toBe(IMAGETYPE_JPEG);
});

test('large photos are scaled down for the page', function () {
    $experience = DigitalExperience::factory()->create();
    $photo = UploadedFile::fake()->image('wide.png', 3000, 1500);

    $path = app(StoreExperiencePhoto::class)->handle($experience, $photo);

    [$width, $height] = getimagesizefromstring(Storage::disk('local')->get($path));

    expect([$width, $height])->toBe([StoreExperiencePhoto::MAX_DIMENSION, 1280]);
});
