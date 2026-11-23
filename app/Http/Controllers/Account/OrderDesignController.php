<?php

namespace App\Http\Controllers\Account;

use App\Actions\Orders\StoreOrderFile;
use App\Enums\ActivityType;
use App\Enums\DesignMode;
use App\Enums\OrderFileKind;
use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Account\UpdateOrderDesignRequest;
use App\Models\Order;
use App\Models\OrderFile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Lets the customer finish their design from the order page after ordering:
 * customize it themselves with the live preview and approve it (final), or
 * send their photos and details for the studio to arrange.
 */
class OrderDesignController extends Controller
{
    /**
     * Personalization fields the customer can fill in.
     *
     * @var list<string>
     */
    private const FIELDS = ['names', 'date', 'message', 'song_title', 'artist', 'color', 'design_brief', 'instructions'];

    public function __construct(private StoreOrderFile $storeOrderFile) {}

    /**
     * Save the design details as a draft.
     */
    public function update(UpdateOrderDesignRequest $request, Order $order): RedirectResponse
    {
        $this->ensureEditable($order);
        $this->saveDetails($request, $order);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Your design is saved. Approve it or send it to us when you are ready.')]);

        return back();
    }

    /**
     * Save the details and approve the design the customer made themselves.
     * Approval is final: production follows exactly what the preview shows.
     *
     * @throws ValidationException
     */
    public function approve(UpdateOrderDesignRequest $request, Order $order): RedirectResponse
    {
        $this->ensureEditable($order);

        if ($order->design_mode !== DesignMode::SelfCustomized || $order->template === null) {
            throw ValidationException::withMessages([
                'design' => 'Our designers are making this design. Send us your photos and details, and we will send the design to you for approval.',
            ]);
        }

        $request->validate(
            ['confirm_final' => ['accepted']],
            ['confirm_final.accepted' => 'Please confirm that you understand an approved design is final.'],
        );

        $this->saveDetails($request, $order);
        $this->ensureComplete($order);

        $order->update(['preview_approved_at' => now()]);

        // An unpaid order stays in its payment status; it moves on to
        // "Design Approved" once the payment is verified.
        if (! $order->status->isPaymentStage()) {
            $order->update(['status' => OrderStatus::DesignApproved]);
        }

        $order->recordActivity(
            ActivityType::DesignApproved,
            'You approved your design from the live preview. Approval is final, so we will make it exactly as shown.',
            $request->user(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => $order->status->isPaymentStage()
            ? __('Design approved! We will start production once your payment is complete.')
            : __('Design approved! We will start production soon.')]);

        return back();
    }

    /**
     * Save the details and hand them to the studio, who arrange them on the
     * chosen design and send a proof for approval.
     *
     * @throws ValidationException
     */
    public function submit(UpdateOrderDesignRequest $request, Order $order): RedirectResponse
    {
        $this->ensureEditable($order);
        $this->saveDetails($request, $order);
        $this->ensureComplete($order);

        $order->update(['design_submitted_at' => now()]);

        $order->recordActivity(
            ActivityType::DesignSubmitted,
            'Photos and details sent to our designers. We will put your design together and send it to you for approval.',
            $request->user(),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Sent! Our designers will send your design for approval.')]);

        return back();
    }

    /**
     * Store the personalization, remove the photos the customer took out and
     * add the new ones.
     */
    private function saveDetails(UpdateOrderDesignRequest $request, Order $order): void
    {
        $input = $request->validated('personalization', []);

        $order->update([
            'personalization' => collect(self::FIELDS)
                ->mapWithKeys(fn (string $field): array => [$field => trim((string) ($input[$field] ?? ''))])
                ->filter(fn (string $value): bool => $value !== '')
                ->all(),
        ]);

        $removing = array_map('intval', $request->validated('remove_photos', []));

        $order->files()
            ->whereIn('id', $removing)
            ->whereIn('kind', [OrderFileKind::Photo, OrderFileKind::Reference])
            ->get()
            ->each(function (OrderFile $file): void {
                Storage::disk($file->disk)->delete($file->path);
                $file->delete();
            });

        $kind = $order->design_mode === DesignMode::SelfCustomized ? OrderFileKind::Photo : OrderFileKind::Reference;

        foreach ($request->file('photos', []) as $photo) {
            $this->storeOrderFile->handle($order, $photo, $kind, $request->user());
        }
    }

    /**
     * The design can only be changed until it is approved, handed to the
     * studio, or the studio has sent a proof.
     *
     * @throws ValidationException
     */
    private function ensureEditable(Order $order): void
    {
        if ($order->isDesignEditableByCustomer()) {
            return;
        }

        throw ValidationException::withMessages(['design' => match (true) {
            ! $order->status->isOpen() => 'This order is closed.',
            $order->preview_approved_at !== null => 'Your design is approved and final, so it can no longer be changed.',
            $order->latestProof !== null => 'Our designers have sent you a design. Please approve it or request changes instead.',
            default => 'Your photos and details are with our designers. You can request changes when they send your design.',
        }]);
    }

    /**
     * Make sure the design has everything the chosen template needs.
     *
     * @throws ValidationException
     */
    private function ensureComplete(Order $order): void
    {
        $details = $order->personalization;
        $missing = [];

        if ($order->design_mode === DesignMode::TaptaleDesigned) {
            if (blank($details['design_brief'] ?? null)) {
                $missing['personalization.design_brief'] = 'Please describe the design you would like us to create.';
            }
        } else {
            if (blank($details['names'] ?? null)) {
                $missing['personalization.names'] = 'Please enter the names to feature on your design.';
            }

            if (! $order->files()->where('kind', OrderFileKind::Photo)->exists()) {
                $missing['photos'] = 'Please add at least one photo for your design.';
            }

            if ($order->template?->layout->usesMusicDetails() === true) {
                if (blank($details['song_title'] ?? null)) {
                    $missing['personalization.song_title'] = 'Please enter the song or album title for your design.';
                }

                if (blank($details['artist'] ?? null)) {
                    $missing['personalization.artist'] = 'Please enter the artist for your design.';
                }
            }
        }

        if ($missing !== []) {
            throw ValidationException::withMessages($missing);
        }
    }
}
