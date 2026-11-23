<?php

namespace App\Http\Controllers\Account;

use App\Actions\Orders\StoreOrderFile;
use App\Enums\ActivityType;
use App\Enums\OrderFileKind;
use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rules\File;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class OrderFileController extends Controller
{
    /**
     * Maximum number of files a customer may attach to one order.
     */
    private const MAX_FILES_PER_ORDER = 20;

    /**
     * Upload additional photos or files to an open order.
     */
    public function store(Request $request, Order $order, StoreOrderFile $storeOrderFile): RedirectResponse
    {
        Gate::authorize('update', $order);

        $validated = $request->validate([
            'files' => ['required', 'array', 'min:1', 'max:5'],
            'files.*' => [File::types(['jpg', 'jpeg', 'png', 'webp', 'pdf'])->max((int) config('taptale.max_upload_kilobytes'))],
            'note' => ['nullable', 'string', 'max:1000'],
        ], attributes: ['files.*' => 'file']);

        if (! $order->status->isOpen()) {
            throw ValidationException::withMessages(['files' => 'Files can only be added to open orders.']);
        }

        if ($order->loadMissing('latestProof')->isDesignApproved()) {
            throw ValidationException::withMessages(['files' => 'Your design is approved and final, so files can no longer be added.']);
        }

        if ($order->files()->count() + count($validated['files']) > self::MAX_FILES_PER_ORDER) {
            throw ValidationException::withMessages(['files' => 'An order can have at most '.self::MAX_FILES_PER_ORDER.' files.']);
        }

        foreach ($validated['files'] as $file) {
            $storeOrderFile->handle($order, $file, OrderFileKind::Additional, $request->user());
        }

        $count = count($validated['files']);
        $body = trim("Uploaded {$count} additional ".str('file')->plural($count).'. '.($validated['note'] ?? ''));

        $order->recordActivity(ActivityType::FilesUploaded, $body, $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Files uploaded. Our team has been notified.')]);

        return back();
    }
}
