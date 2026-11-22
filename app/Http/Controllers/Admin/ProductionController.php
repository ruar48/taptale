<?php

namespace App\Http\Controllers\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The workshop board: approved designs waiting to be made, orders being
 * made, and packed orders waiting for the courier.
 */
class ProductionController extends Controller
{
    /**
     * Board columns in workflow order, each with the status a card moves to.
     *
     * @var array<string, string|null>
     */
    private const COLUMNS = [
        'design_approved' => 'in_production',
        'in_production' => 'ready_for_shipment',
        'ready_for_shipment' => null,
    ];

    public function __invoke(): Response
    {
        $orders = Order::query()
            ->with('payments')
            ->whereIn('status', array_keys(self::COLUMNS))
            ->oldest('updated_at')
            ->get(['id', 'reference', 'status', 'product_name', 'quantity', 'customer_name', 'city', 'is_gift', 'total', 'created_at', 'updated_at'])
            ->groupBy(fn (Order $order): string => $order->status->value);

        return Inertia::render('admin/production', [
            'columns' => collect(self::COLUMNS)->map(fn (?string $next, string $status): array => [
                'status' => $status,
                'label' => OrderStatus::from($status)->label(),
                'next_status' => $next,
                'next_label' => $next !== null ? OrderStatus::from($next)->label() : null,
                'orders' => ($orders->get($status) ?? collect())->map(fn (Order $order): array => [
                    'reference' => $order->reference,
                    'product_name' => $order->product_name,
                    'quantity' => $order->quantity,
                    'customer_name' => $order->customer_name,
                    'city' => $order->city,
                    'is_gift' => $order->is_gift,
                    'balance_due' => $order->balanceDue(),
                    'ordered_at' => $order->created_at?->toIso8601String(),
                    'waiting_since' => $order->updated_at?->toIso8601String(),
                ])->values(),
            ])->values(),
        ]);
    }
}
