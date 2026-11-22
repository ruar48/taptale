import { Head } from '@inertiajs/react';
import { Fragment, useState } from 'react';
import {
    AdminPage,
    PageHeader,
    TableShell,
} from '@/components/taptale/admin-ui';
import { Pagination } from '@/components/taptale/pagination';
import { formatDate } from '@/lib/money';
import { auditLog } from '@/routes/admin';
import type { SimplePaginated } from '@/types';

type AuditEntry = {
    id: number;
    user: string | null;
    action: string;
    method: string;
    url: string;
    subject: Record<string, string | number> | null;
    changes: Record<string, unknown> | null;
    ip_address: string | null;
    created_at: string;
};

export default function AdminAuditLog({
    logs,
}: {
    logs: SimplePaginated<AuditEntry>;
}) {
    const [open, setOpen] = useState<number | null>(null);

    return (
        <>
            <Head title="Audit Log" />
            <AdminPage>
                <PageHeader
                    title="Audit log"
                    description="Every change made in the admin dashboard: who did it, when, and from where."
                />
                <TableShell>
                    <thead>
                        <tr>
                            <th>When</th>
                            <th>Who</th>
                            <th>What</th>
                            <th className="hidden md:table-cell">Record</th>
                            <th className="hidden lg:table-cell">IP address</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.data.length === 0 && (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="py-10 text-center text-muted-foreground"
                                >
                                    No admin changes recorded yet.
                                </td>
                            </tr>
                        )}
                        {logs.data.map((log) => (
                            <Fragment key={log.id}>
                                <tr
                                    className="cursor-pointer"
                                    onClick={() =>
                                        setOpen(open === log.id ? null : log.id)
                                    }
                                >
                                    <td className="text-xs whitespace-nowrap text-muted-foreground">
                                        {formatDate(log.created_at, true)}
                                    </td>
                                    <td>{log.user ?? 'Deleted user'}</td>
                                    <td>
                                        <p className="font-medium">
                                            {log.action}
                                        </p>
                                        <p className="font-mono text-[11px] text-muted-foreground">
                                            {log.method} {log.url}
                                        </p>
                                    </td>
                                    <td className="hidden font-mono text-xs md:table-cell">
                                        {log.subject
                                            ? Object.values(log.subject).join(
                                                  ' · ',
                                              )
                                            : '—'}
                                    </td>
                                    <td className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                                        {log.ip_address ?? '—'}
                                    </td>
                                </tr>
                                {open === log.id && (
                                    <tr>
                                        <td colSpan={5} className="bg-muted/40">
                                            {log.changes ? (
                                                <pre className="max-h-64 overflow-auto text-xs whitespace-pre-wrap">
                                                    {JSON.stringify(
                                                        log.changes,
                                                        null,
                                                        2,
                                                    )}
                                                </pre>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">
                                                    No values were submitted.
                                                </p>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
                </TableShell>
                <Pagination links={logs.links} />
            </AdminPage>
        </>
    );
}

AdminAuditLog.layout = {
    breadcrumbs: [{ title: 'Audit log', href: auditLog() }],
};
