<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActivityType;
use App\Enums\OrderStatus;
use App\Enums\ProofStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\File;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class DesignProofController extends Controller
{
    /**
     * Upload a prepared (or revised) design and send it to the customer for approval.
     */
    public function store(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'proof' => ['required', File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(10240)],
            'designer_notes' => ['nullable', 'string', 'max:2000'],
        ], ['proof.required' => 'Please choose the design image to send.']);

        if (! $order->status->isOpen()) {
            throw ValidationException::withMessages(['proof' => 'Designs cannot be sent for closed orders.']);
        }

        $disk = (string) config('taptale.uploads_disk');
        $version = $order->nextProofVersion();

        $order->proofs()->create([
            'uploaded_by' => $request->user()->id,
            'version' => $version,
            'disk' => $disk,
            'path' => $request->file('proof')->store("proofs/{$order->id}", $disk),
            'designer_notes' => $validated['designer_notes'] ?? null,
            'status' => ProofStatus::AwaitingResponse,
        ]);

        $order->update(['status' => OrderStatus::AwaitingCustomerApproval]);
        $order->recordActivity(
            ActivityType::ProofSent,
            trim("Design v{$version} is ready for your review. ".($validated['designer_notes'] ?? '')),
            $request->user(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Design v:version sent to the customer.', ['version' => $version])]);

        return back();
    }
}
