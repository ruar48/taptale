<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Records every successful change made in the admin dashboard: who, what,
 * on which record, with which values, and from where. Running on the whole
 * admin route group means new admin actions are covered automatically. It
 * also runs on customer pages administrators can edit (memory pages), where
 * only the administrators' changes are recorded.
 */
class RecordAdminAudit
{
    /**
     * Fields that are never written to the log.
     *
     * @var list<string>
     */
    private const SECRET_FIELDS = ['_token', '_method', 'password', 'password_confirmation', 'current_password'];

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $isFailure = $response->getStatusCode() >= 400
            || ($request->hasSession() && $request->session()->has('errors'));

        if ($request->isMethodSafe() || $request->user()?->isAdmin() !== true || $isFailure) {
            return $response;
        }

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => (string) ($request->route()?->getName() ?? 'unknown'),
            'method' => $request->method(),
            'url' => Str::limit('/'.ltrim($request->path(), '/'), 490),
            'subject' => $this->subject($request),
            'changes' => $this->clean($request->except(self::SECRET_FIELDS)) ?: null,
            'ip_address' => $request->ip(),
        ]);

        return $response;
    }

    /**
     * The record keys exactly as they appeared in the URL (order reference,
     * record id), so a renamed or deleted record still shows what was hit.
     *
     * @return array<string, string>|null
     */
    private function subject(Request $request): ?array
    {
        return $request->route()?->originalParameters() ?: null;
    }

    /**
     * Replace uploads with their file names and shorten long text.
     *
     * @param  array<array-key, mixed>  $input
     * @return array<array-key, mixed>
     */
    private function clean(array $input): array
    {
        return array_map(fn (mixed $value): mixed => match (true) {
            $value instanceof UploadedFile => '[file] '.Str::limit($value->getClientOriginalName(), 120),
            is_array($value) => $this->clean($value),
            is_string($value) => Str::limit($value, 500),
            default => $value,
        }, $input);
    }
}
