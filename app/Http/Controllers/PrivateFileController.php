<?php

namespace App\Http\Controllers;

use App\Models\DesignProof;
use App\Models\OrderFile;
use App\Models\Payment;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Streams private customer files after checking the viewer may see the order.
 */
class PrivateFileController extends Controller
{
    /**
     * Stream a customer-uploaded order file.
     */
    public function orderFile(OrderFile $orderFile): StreamedResponse
    {
        Gate::authorize('view', $orderFile->order);

        return $this->stream($orderFile->disk, $orderFile->path, $orderFile->original_name);
    }

    /**
     * Stream a design proof image.
     */
    public function proof(DesignProof $proof): StreamedResponse
    {
        Gate::authorize('view', $proof->order);

        return $this->stream($proof->disk, $proof->path);
    }

    /**
     * Stream a payment receipt.
     */
    public function payment(Payment $payment): StreamedResponse
    {
        Gate::authorize('view', $payment->order);

        abort_if($payment->proof_path === null || $payment->proof_disk === null, 404);

        return $this->stream($payment->proof_disk, $payment->proof_path);
    }

    private function stream(string $disk, string $path, ?string $name = null): StreamedResponse
    {
        $storage = Storage::disk($disk);

        abort_unless($storage->exists($path), 404);

        return $storage->response($path, $name, [
            'Cache-Control' => 'private, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
