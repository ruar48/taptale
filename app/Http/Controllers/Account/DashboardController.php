<?php

namespace App\Http\Controllers\Account;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Show the customer's account overview. Administrators land on the admin dashboard.
     */
    public function __invoke(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            return to_route('admin.dashboard');
        }

        $orders = $user->orders()->latest()->latest('id')->limit(5)->get();

        $needsAttention = $user->orders()
            ->whereIn('status', [OrderStatus::AwaitingPayment, OrderStatus::PendingOrder, OrderStatus::AwaitingCustomerApproval])
            ->latest()
            ->get();

        return Inertia::render('dashboard', [
            'recentOrders' => OrderResource::collection($orders),
            'needsAttention' => OrderResource::collection($needsAttention),
            'stats' => [
                'total' => $user->orders()->count(),
                'open' => $user->orders()->whereNotIn('status', [OrderStatus::Completed, OrderStatus::Cancelled])->count(),
                'completed' => $user->orders()->where('status', OrderStatus::Completed)->count(),
            ],
        ]);
    }
}
