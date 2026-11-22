<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Read-only history of every change administrators made.
 */
class AuditLogController extends Controller
{
    public function __invoke(): Response
    {
        $logs = AuditLog::query()
            ->with('user:id,name')
            ->latest('created_at')
            ->latest('id')
            ->paginate(50);

        return Inertia::render('admin/audit-log', [
            'logs' => $logs->through(fn (AuditLog $log): array => [
                'id' => $log->id,
                'user' => $log->user?->name,
                'action' => $this->describe($log->action),
                'method' => $log->method,
                'url' => $log->url,
                'subject' => $log->subject,
                'changes' => $log->changes,
                'ip_address' => $log->ip_address,
                'created_at' => $log->created_at->toIso8601String(),
            ]),
        ]);
    }

    /**
     * "admin.orders.refunds.store" becomes "Orders › Refunds — Added".
     */
    private function describe(string $action): string
    {
        $parts = explode('.', Str::after($action, 'admin.'));
        $verb = count($parts) > 1 ? array_pop($parts) : 'update';

        $verbLabel = match ($verb) {
            'store' => 'Added',
            'update' => 'Updated',
            'destroy' => 'Deleted',
            default => Str::headline($verb),
        };

        return collect($parts)->map(fn (string $part): string => Str::headline($part))->implode(' › ').' — '.$verbLabel;
    }
}
