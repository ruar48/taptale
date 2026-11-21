<?php

namespace App\Actions\Orders;

use App\Enums\OrderFileKind;
use App\Models\Order;
use App\Models\OrderFile;
use App\Models\User;
use Illuminate\Http\UploadedFile;

/**
 * Stores a customer file privately and attaches it to an order.
 */
class StoreOrderFile
{
    public function handle(Order $order, UploadedFile $file, OrderFileKind $kind, ?User $uploader = null): OrderFile
    {
        $disk = (string) config('taptale.uploads_disk');
        $path = $file->store("orders/{$order->id}", $disk);

        return $order->files()->create([
            'user_id' => $uploader?->id,
            'kind' => $kind,
            'disk' => $disk,
            'path' => $path,
            'original_name' => mb_substr($file->getClientOriginalName(), 0, 200),
            'mime_type' => (string) $file->getMimeType(),
            'size' => (int) $file->getSize(),
        ]);
    }
}
