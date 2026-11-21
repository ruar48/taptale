import { Head, Link } from '@inertiajs/react';
import { Pencil, Plus } from 'lucide-react';
import TemplateController from '@/actions/App/Http/Controllers/Admin/TemplateController';
import {
    AdminPage,
    ConfirmDelete,
    PageHeader,
} from '@/components/taptale/admin-ui';
import { StatusBadge } from '@/components/taptale/status-badge';
import { TemplatePreview } from '@/components/taptale/template-preview';
import { Button } from '@/components/ui/button';
import { create, edit, index } from '@/routes/admin/templates';
import type { Template } from '@/types';

export default function AdminTemplates({
    templates,
}: {
    templates: Template[];
}) {
    return (
        <>
            <Head title="Templates" />
            <AdminPage>
                <PageHeader
                    title="Design templates"
                    description="Templates customers choose in the order wizard. Enable, disable and assign them to occasions."
                    actions={
                        <Button asChild>
                            <Link href={create()}>
                                <Plus className="size-4" /> New template
                            </Link>
                        </Button>
                    }
                />
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
                    {templates.map((template) => (
                        <div key={template.id} className="group">
                            <Link
                                href={edit(template.slug)}
                                className={
                                    template.is_active ? '' : 'opacity-50'
                                }
                            >
                                <div className="overflow-hidden rounded-2xl border shadow-sm transition group-hover:shadow-md">
                                    <TemplatePreview
                                        layout={template.layout}
                                        palette={template.palette}
                                        imageUrl={template.preview_url}
                                    />
                                </div>
                            </Link>
                            <div className="mt-2 flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="truncate font-medium">
                                        {template.name}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {template.categories
                                            ?.map((category) => category.name)
                                            .join(', ')}
                                    </p>
                                    <div className="mt-1 flex gap-1">
                                        <StatusBadge
                                            tone={
                                                template.is_active
                                                    ? 'emerald'
                                                    : 'zinc'
                                            }
                                        >
                                            {template.is_active
                                                ? 'Enabled'
                                                : 'Disabled'}
                                        </StatusBadge>
                                    </div>
                                </div>
                                <div className="flex shrink-0">
                                    <Button
                                        asChild
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Edit ${template.name}`}
                                    >
                                        <Link href={edit(template.slug)}>
                                            <Pencil className="size-4" />
                                        </Link>
                                    </Button>
                                    <ConfirmDelete
                                        title={`Delete ${template.name}?`}
                                        description="Placed orders keep the template name. To hide it instead, disable the template."
                                        url={TemplateController.destroy.url(
                                            template.slug,
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </AdminPage>
        </>
    );
}

AdminTemplates.layout = {
    breadcrumbs: [{ title: 'Templates', href: index() }],
};
