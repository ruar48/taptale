import { Head, useForm } from '@inertiajs/react';
import { Loader2, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import CategoryController from '@/actions/App/Http/Controllers/Admin/CategoryController';
import {
    AdminPage,
    CheckboxField,
    ColorInput,
    ConfirmDelete,
    FormField,
    PageHeader,
    TableShell,
} from '@/components/taptale/admin-ui';
import { CATEGORY_ICONS, CategoryIcon } from '@/components/taptale/category-icon';
import { FileDropzone } from '@/components/taptale/file-dropzone';
import { StatusBadge } from '@/components/taptale/status-badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { index } from '@/routes/admin/categories';
import type { Category } from '@/types';

export default function AdminCategories({ categories }: { categories: Category[] }) {
    const [editing, setEditing] = useState<Category | null | undefined>(undefined);

    return (
        <>
            <Head title="Categories" />
            <AdminPage>
                <PageHeader
                    title="Categories"
                    description="Occasions customers shop by. Each has its own products and templates."
                    actions={
                        <Button onClick={() => setEditing(null)}>
                            <Plus className="size-4" /> New category
                        </Button>
                    }
                />
                <TableShell>
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th className="hidden md:table-cell">Slug</th>
                            <th>Products</th>
                            <th>Status</th>
                            <th className="w-24" />
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((category) => (
                            <tr key={category.id}>
                                <td>
                                    <div className="flex items-center gap-3">
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: category.accent_color }}>
                                            <CategoryIcon name={category.icon} className="size-4" />
                                        </span>
                                        <div>
                                            <p className="font-medium">{category.name}</p>
                                            <p className="line-clamp-1 text-xs text-muted-foreground">{category.tagline}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="hidden font-mono text-xs text-muted-foreground md:table-cell">{category.slug}</td>
                                <td>{category.products_count ?? 0}</td>
                                <td>
                                    <StatusBadge tone={category.is_active ? 'emerald' : 'zinc'}>{category.is_active ? 'Visible' : 'Hidden'}</StatusBadge>
                                </td>
                                <td>
                                    <div className="flex justify-end">
                                        <Button variant="ghost" size="icon" onClick={() => setEditing(category)} aria-label={`Edit ${category.name}`}>
                                            <Pencil className="size-4" />
                                        </Button>
                                        <ConfirmDelete
                                            title={`Delete ${category.name}?`}
                                            description="Products stay in the catalog but will no longer be listed under this occasion."
                                            url={CategoryController.destroy.url(category.slug)}
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </TableShell>
            </AdminPage>

            <Dialog open={editing !== undefined} onOpenChange={(open) => !open && setEditing(undefined)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                    {editing !== undefined && (
                        <CategoryForm
                            key={editing?.id ?? 'new'}
                            category={editing}
                            nextSortOrder={categories.length}
                            onDone={() => setEditing(undefined)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

AdminCategories.layout = {
    breadcrumbs: [{ title: 'Categories', href: index() }],
};

function CategoryForm({
    category,
    nextSortOrder,
    onDone,
}: {
    category: Category | null;
    nextSortOrder: number;
    onDone: () => void;
}) {
    const form = useForm({
        ...(category ? { _method: 'put' } : {}),
        name: category?.name ?? '',
        slug: category?.slug ?? '',
        tagline: category?.tagline ?? '',
        description: category?.description ?? '',
        accent_color: category?.accent_color ?? '#B86F83',
        icon: category?.icon ?? 'gift',
        sort_order: category?.sort_order ?? nextSortOrder,
        is_active: category?.is_active ?? true,
        image: null as File | null,
        remove_image: false,
    });

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        form.post(category ? CategoryController.update.url(category.slug) : CategoryController.store.url(), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: onDone,
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <DialogTitle>{category ? 'Edit category' : 'New category'}</DialogTitle>
            <DialogDescription>Shown on the storefront, the occasion step of the order wizard, and in navigation.</DialogDescription>

            <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Name" htmlFor="name" error={form.errors.name}>
                    <Input id="name" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                </FormField>
                <FormField label="Slug" htmlFor="slug" error={form.errors.slug} hint="Leave blank to generate from the name.">
                    <Input id="slug" value={form.data.slug} onChange={(event) => form.setData('slug', event.target.value)} className="font-mono" />
                </FormField>
            </div>
            <FormField label="Tagline" htmlFor="tagline" error={form.errors.tagline}>
                <Input id="tagline" value={form.data.tagline} onChange={(event) => form.setData('tagline', event.target.value)} />
            </FormField>
            <FormField label="Description" htmlFor="description" error={form.errors.description}>
                <Textarea id="description" value={form.data.description} onChange={(event) => form.setData('description', event.target.value)} rows={3} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-3">
                <FormField label="Accent color" error={form.errors.accent_color}>
                    <ColorInput value={form.data.accent_color} onChange={(value) => form.setData('accent_color', value)} />
                </FormField>
                <FormField label="Icon" error={form.errors.icon}>
                    <Select value={form.data.icon} onValueChange={(value) => form.setData('icon', value)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.keys(CATEGORY_ICONS).map((icon) => (
                                <SelectItem key={icon} value={icon}>
                                    <span className="flex items-center gap-2"><CategoryIcon name={icon} className="size-4" /> {icon}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>
                <FormField label="Sort order" htmlFor="sort_order" error={form.errors.sort_order}>
                    <Input id="sort_order" type="number" min={0} value={form.data.sort_order} onChange={(event) => form.setData('sort_order', Number(event.target.value))} />
                </FormField>
            </div>
            <FormField label="Cover image" error={form.errors.image}>
                {category?.image_url && !form.data.remove_image && !form.data.image && (
                    <div className="flex items-center gap-3">
                        <img src={category.image_url} alt="" className="h-16 w-24 rounded-lg object-cover" />
                        <Button type="button" variant="outline" size="sm" onClick={() => form.setData('remove_image', true)}>Remove</Button>
                    </div>
                )}
                <FileDropzone id="category-image" files={form.data.image ? [form.data.image] : []} onChange={(files) => form.setData('image', files[0] ?? null)} maxFiles={1} maxKilobytes={4096} label="Upload image" />
            </FormField>
            <CheckboxField label="Visible on storefront" checked={form.data.is_active} onChange={(value) => form.setData('is_active', value)} />

            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
                <Button type="submit" disabled={form.processing}>
                    {form.processing && <Loader2 className="size-4 animate-spin" />} {category ? 'Save changes' : 'Create category'}
                </Button>
            </div>
        </form>
    );
}
