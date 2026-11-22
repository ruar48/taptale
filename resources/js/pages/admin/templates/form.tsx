import { Head, setLayoutProps, useForm } from '@inertiajs/react';
import { Check, Loader2 } from 'lucide-react';
import TemplateController from '@/actions/App/Http/Controllers/Admin/TemplateController';
import {
    AdminPage,
    CheckboxField,
    ColorInput,
    FormField,
    PageHeader,
} from '@/components/taptale/admin-ui';
import { FileDropzone } from '@/components/taptale/file-dropzone';
import { Panel } from '@/components/taptale/order-parts';
import { TemplatePreview } from '@/components/taptale/template-preview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { create, edit, index } from '@/routes/admin/templates';
import type { Template, TemplateLayout } from '@/types';

type Props = {
    template: Template | null;
    categories: { id: number; name: string }[];
    products: { id: number; name: string }[];
    layouts: { value: TemplateLayout; label: string }[];
};

export default function TemplateForm({
    template,
    categories,
    products,
    layouts,
}: Props) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'Templates', href: index() },
            template
                ? { title: template.name, href: edit(template.slug) }
                : { title: 'New Template', href: create() },
        ],
    });

    const form = useForm({
        ...(template ? { _method: 'put' } : {}),
        name: template?.name ?? '',
        slug: template?.slug ?? '',
        description: template?.description ?? '',
        layout: template?.layout ?? ('polaroid' as TemplateLayout),
        palette: template?.palette ?? {
            background: '#F8F3ED',
            ink: '#343039',
            accent: '#B86F83',
        },
        is_active: template?.is_active ?? true,
        is_featured: template?.is_featured ?? false,
        sort_order: template?.sort_order ?? 0,
        category_ids:
            template?.categories?.map((category) => category.id) ??
            ([] as number[]),
        product_ids: template?.product_ids ?? ([] as number[]),
        preview: null as File | null,
        mockup: null as File | null,
        remove_preview: false,
        remove_mockup: false,
    });
    const { data, setData, errors } = form;

    const toggle = (key: 'category_ids' | 'product_ids', id: number) =>
        setData(
            key,
            data[key].includes(id)
                ? data[key].filter((value) => value !== id)
                : [...data[key], id],
        );

    const paletteError =
        errors['palette.background'] ??
        errors['palette.ink'] ??
        errors['palette.accent'];

    return (
        <>
            <Head title={template ? `Edit ${template.name}` : 'New template'} />
            <AdminPage className="max-w-6xl">
                <PageHeader
                    title={template ? template.name : 'New template'}
                    description="Layouts render a live preview with each customer's photos and text."
                />
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.post(
                            template
                                ? TemplateController.update.url(template.slug)
                                : TemplateController.store.url(),
                            {
                                forceFormData: true,
                                preserveScroll: true,
                            },
                        );
                    }}
                    className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"
                >
                    <div className="space-y-6">
                        <Panel title="Details">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField
                                    label="Name"
                                    htmlFor="name"
                                    error={errors.name}
                                >
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(event) =>
                                            setData('name', event.target.value)
                                        }
                                    />
                                </FormField>
                                <FormField
                                    label="Slug"
                                    htmlFor="slug"
                                    error={errors.slug}
                                    hint="Leave blank to generate."
                                >
                                    <Input
                                        id="slug"
                                        value={data.slug}
                                        onChange={(event) =>
                                            setData('slug', event.target.value)
                                        }
                                        className="font-mono"
                                    />
                                </FormField>
                                <FormField
                                    label="Description"
                                    htmlFor="description"
                                    error={errors.description}
                                    className="sm:col-span-2"
                                >
                                    <Input
                                        id="description"
                                        value={data.description}
                                        onChange={(event) =>
                                            setData(
                                                'description',
                                                event.target.value,
                                            )
                                        }
                                        maxLength={255}
                                    />
                                </FormField>
                                <FormField label="Layout" error={errors.layout}>
                                    <Select
                                        value={data.layout}
                                        onValueChange={(value) =>
                                            setData(
                                                'layout',
                                                value as TemplateLayout,
                                            )
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {layouts.map((layout) => (
                                                <SelectItem
                                                    key={layout.value}
                                                    value={layout.value}
                                                >
                                                    {layout.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormField>
                                <FormField
                                    label="Sort order"
                                    htmlFor="sort_order"
                                    error={errors.sort_order}
                                >
                                    <Input
                                        id="sort_order"
                                        type="number"
                                        min={0}
                                        value={data.sort_order}
                                        onChange={(event) =>
                                            setData(
                                                'sort_order',
                                                Number(event.target.value),
                                            )
                                        }
                                    />
                                </FormField>
                            </div>
                        </Panel>

                        <Panel title="Colors">
                            <div className="grid gap-4 sm:grid-cols-3">
                                {(['background', 'ink', 'accent'] as const).map(
                                    (key) => (
                                        <FormField
                                            key={key}
                                            label={
                                                key === 'ink'
                                                    ? 'Text'
                                                    : key[0].toUpperCase() +
                                                      key.slice(1)
                                            }
                                        >
                                            <ColorInput
                                                value={data.palette[key]}
                                                onChange={(value) =>
                                                    setData('palette', {
                                                        ...data.palette,
                                                        [key]: value,
                                                    })
                                                }
                                            />
                                        </FormField>
                                    ),
                                )}
                            </div>
                            {paletteError && (
                                <p className="mt-2 text-sm text-destructive">
                                    {paletteError}
                                </p>
                            )}
                        </Panel>

                        <Panel
                            title="Preview & mockup images"
                            description="Optional. Uploaded previews replace the generated preview in galleries; mockups show the design on a real product."
                        >
                            <div className="grid gap-6 sm:grid-cols-2">
                                {(['preview', 'mockup'] as const).map(
                                    (kind) => {
                                        const existing =
                                            kind === 'preview'
                                                ? template?.preview_url
                                                : template?.mockup_url;
                                        const removeKey =
                                            kind === 'preview'
                                                ? 'remove_preview'
                                                : 'remove_mockup';

                                        return (
                                            <FormField
                                                key={kind}
                                                label={
                                                    kind === 'preview'
                                                        ? 'Template preview'
                                                        : 'Sample product mockup'
                                                }
                                                error={errors[kind]}
                                            >
                                                {existing &&
                                                    !data[removeKey] &&
                                                    !data[kind] && (
                                                        <div className="flex items-center gap-3">
                                                            <img
                                                                src={existing}
                                                                alt=""
                                                                className="h-20 w-16 rounded-lg object-cover"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    setData(
                                                                        removeKey,
                                                                        true,
                                                                    )
                                                                }
                                                            >
                                                                Remove
                                                            </Button>
                                                        </div>
                                                    )}
                                                <FileDropzone
                                                    id={`template-${kind}`}
                                                    files={
                                                        data[kind]
                                                            ? [
                                                                  data[
                                                                      kind
                                                                  ] as File,
                                                              ]
                                                            : []
                                                    }
                                                    onChange={(files) =>
                                                        setData(
                                                            kind,
                                                            files[0] ?? null,
                                                        )
                                                    }
                                                    maxFiles={1}
                                                    maxKilobytes={6144}
                                                    label={`Upload ${kind}`}
                                                />
                                            </FormField>
                                        );
                                    },
                                )}
                            </div>
                        </Panel>

                        <Panel title="Where it appears">
                            <p className="mb-2 text-sm font-medium">
                                Categories
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {categories.map((category) => (
                                    <Chip
                                        key={category.id}
                                        active={data.category_ids.includes(
                                            category.id,
                                        )}
                                        onClick={() =>
                                            toggle('category_ids', category.id)
                                        }
                                    >
                                        {category.name}
                                    </Chip>
                                ))}
                            </div>
                            {errors.category_ids && (
                                <p className="mt-2 text-sm text-destructive">
                                    {errors.category_ids}
                                </p>
                            )}
                            <p className="mt-6 mb-1 text-sm font-medium">
                                Limit to products (optional)
                            </p>
                            <p className="mb-2 text-xs text-muted-foreground">
                                Leave empty to offer this template for every
                                product in the chosen categories.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {products.map((product) => (
                                    <Chip
                                        key={product.id}
                                        active={data.product_ids.includes(
                                            product.id,
                                        )}
                                        onClick={() =>
                                            toggle('product_ids', product.id)
                                        }
                                    >
                                        {product.name}
                                    </Chip>
                                ))}
                            </div>
                        </Panel>
                    </div>

                    <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
                        <div className="overflow-hidden rounded-2xl border shadow-sm">
                            <TemplatePreview
                                layout={data.layout}
                                palette={data.palette}
                            />
                        </div>
                        <CheckboxField
                            label="Enabled"
                            description="Customers can choose it."
                            checked={data.is_active}
                            onChange={(value) => setData('is_active', value)}
                        />
                        <CheckboxField
                            label="Featured"
                            description="Shown on the homepage."
                            checked={data.is_featured}
                            onChange={(value) => setData('is_featured', value)}
                        />
                        <Button
                            type="submit"
                            disabled={form.processing}
                            className="w-full"
                            size="lg"
                        >
                            {form.processing && (
                                <Loader2 className="size-4 animate-spin" />
                            )}{' '}
                            {template ? 'Save template' : 'Create template'}
                        </Button>
                    </div>
                </form>
            </AdminPage>
        </>
    );
}

function Chip({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition',
                active
                    ? 'border-plum bg-plum text-white dark:border-blush dark:bg-blush dark:text-plum-dark'
                    : 'hover:border-rose',
            )}
        >
            {active && <Check className="size-3.5" />}
            {children}
        </button>
    );
}
