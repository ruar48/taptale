<?php

namespace App\Http\Controllers\Admin;

use App\Enums\OrderStatus;
use App\Enums\PaymentKind;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Show the studio overview.
     */
    public function __invoke(): Response
    {
        $statusCounts = Order::query()->toBase()->selectRaw('status, count(*) as aggregate')->groupBy('status')->pluck('aggregate', 'status');

        $count = fn (OrderStatus ...$statuses): int => (int) collect($statuses)->sum(fn (OrderStatus $status) => $statusCounts[$status->value] ?? 0);

        $received = (int) Payment::query()->where('status', PaymentStatus::Verified)->where('kind', PaymentKind::Payment)->sum('amount');
        $refunded = (int) Payment::query()->where('status', PaymentStatus::Verified)->where('kind', PaymentKind::Refund)->sum('amount');

        return Inertia::render('admin/dashboard', [
            'metrics' => [
                'revenue' => $received - $refunded,
                'orders_this_month' => Order::query()->where('created_at', '>=', now()->startOfMonth())->count(),
                'customers' => User::query()->where('is_admin', false)->count(),
                'pending_payments' => Payment::query()->where('status', PaymentStatus::Submitted)->count(),
            ],
            'queues' => [
                ['label' => 'Payments to verify', 'status' => OrderStatus::PaymentVerification->value, 'count' => $count(OrderStatus::PaymentVerification)],
                ['label' => 'Designs to prepare', 'status' => OrderStatus::PendingDesign->value, 'count' => $count(OrderStatus::PendingDesign, OrderStatus::DesignInProgress)],
                ['label' => 'Revisions requested', 'status' => OrderStatus::RevisionRequested->value, 'count' => $count(OrderStatus::RevisionRequested)],
                ['label' => 'Awaiting customer approval', 'status' => OrderStatus::AwaitingCustomerApproval->value, 'count' => $count(OrderStatus::AwaitingCustomerApproval)],
                ['label' => 'Ready for production', 'status' => OrderStatus::DesignApproved->value, 'count' => $count(OrderStatus::DesignApproved)],
                ['label' => 'In production', 'status' => OrderStatus::InProduction->value, 'count' => $count(OrderStatus::InProduction)],
                ['label' => 'Ready to ship', 'status' => OrderStatus::ReadyForShipment->value, 'count' => $count(OrderStatus::ReadyForShipment)],
            ],
            'recentOrders' => OrderResource::collection(Order::query()->latest()->latest('id')->limit(8)->get()),
        ]);
    }
}
