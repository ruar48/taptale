<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    /**
     * List registered customers.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();

        $customers = User::query()
            ->where('is_admin', false)
            ->withCount('orders')
            ->withSum('orders', 'total')
            ->when($search !== '', fn (Builder $query) => $query->where(fn (Builder $inner) => $inner
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")))
            ->latest()
            ->latest('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'orders_count' => $user->orders_count,
                'orders_sum_total' => (int) $user->orders_sum_total,
                'created_at' => $user->created_at?->toIso8601String(),
            ]);

        return Inertia::render('admin/customers/index', [
            'customers' => $customers,
            'filters' => ['search' => $search],
        ]);
    }

    /**
     * Show a customer's details and order history.
     */
    public function show(User $customer): Response
    {
        return Inertia::render('admin/customers/show', [
            'customer' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'address_line' => $customer->address_line,
                'city' => $customer->city,
                'province' => $customer->province,
                'postal_code' => $customer->postal_code,
                'email_verified_at' => $customer->email_verified_at?->toIso8601String(),
                'created_at' => $customer->created_at?->toIso8601String(),
            ],
            'orders' => OrderResource::collection($customer->orders()->latest()->latest('id')->get()),
        ]);
    }

    /**
     * Update a customer's contact information.
     */
    public function update(Request $request, User $customer): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($customer)],
            'phone' => ['nullable', 'string', 'max:32'],
            'address_line' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:120'],
            'province' => ['nullable', 'string', 'max:120'],
            'postal_code' => ['nullable', 'string', 'max:16'],
        ]);

        $customer->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Customer updated.')]);

        return back();
    }
}
