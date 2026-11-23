import { Head, router, setLayoutProps, useForm } from '@inertiajs/react';
import { Check, Loader2, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import ProductController from '@/actions/App/Http/Controllers/Admin/ProductController';
import ProductImageController from '@/actions/App/Http/Controllers/Admin/ProductImageController';
import ProductOptionController from '@/actions/App/Http/Controllers/Admin/ProductOptionController';
import {
    AdminPage,
    CheckboxField,
    ColorInput,
    ConfirmDelete,
    FormField,
    PageHeader,
} from '@/components/taptale/admin-ui';
import { FileDropzone } from '@/components/taptale/file-dropzone';
import { Panel } from '@/components/taptale/order-parts';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMoney } from '@/hooks/use-money';
import { toPesoInput } from '@/lib/money';
import { cn } from '@/lib/utils';
import { create, edit, index } from '@/routes/admin/products';
import type { Product, ProductOption } from '@/types';

type GroupOption = { value: string; label: string; multiple: boolean };

type Props = {
    product: Product | null;
    categories: { id: number; name: string }[];
    optionGroups: GroupOption[];
    artStyles: string[];
};

export default function ProductForm({
    product,
    categories,
    optionGroups,
    artStyles,
}: Props) {
    setLayoutProps({
        breadcrumbs: [
            { title: 'Products', href: index() },
            product
                ? { title: product.name, href: edit(product.slug) }
                : { title: 'New Product', href: create() },
        ],
    });

    return (
        <>
            <Head title={product ? `Edit ${product.name}` : 'New product'} />
            <AdminPage className="max-w-6xl">
                <PageHeader
                    title={product ? product.name : 'New product'}
                    description={
                        product
                            ? 'Details, gallery, options and pricing.'
                            : 'Start with the details — you can add photos and options after saving.'
                    }
                />
                <DetailsForm
                    product={product}
                    categories={categories}
                    artStyles={artStyles}
                />
                {product && (
                    <>
                        <GalleryPanel product={product} />
                        <OptionsPanel
                            product={product}
                            optionGroups={optionGroups}
                        />
                    </>
                )}
            </AdminPage>
        </>
    );
}

function DetailsForm({
    product,
    categories,
    artStyles,
}: Omit<Props, 'optionGroups'>) {
    const form = useForm({
        name: product?.name ?? '',
        slug: product?.slug ?? '',
        short_description: product?.short_description ?? '',
        description: product?.description ?? '',
        art_style: product?.art_style ?? 'acrylic',
        base_price: toPesoInput(product?.base_price),
        design_fee: toPesoInput(product?.design_fee ?? 5000),
        production_days_min: product?.production_days_min ?? 3,
        production_days_max: product?.production_days_max ?? 5,
        min_quantity: product?.min_quantity ?? 1,
        max_quantity: product?.max_quantity ?? 200,
        max_photos: product?.max_photos ?? 3,
        has_digital_experience: product?.has_digital_experience ?? false,
        is_active: product?.is_active ?? true,
        is_featured: product?.is_featured ?? false,
        is_bestseller: product?.is_bestseller ?? false,
        sort_order: product?.sort_order ?? 0,
        category_ids:
            product?.categories?.map((category) => category.id) ??
            ([] as number[]),
    });
    const { data, setData, errors } = form;

    const toggleId = (key: 'category_ids', id: number) =>
        setData(
            key,
            data[key].includes(id)
                ? data[key].filter((value) => value !== id)
                : [...data[key], id],
        );

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();

                if (product) {
                    form.put(ProductController.update.url(product.slug), {
                        preserveScroll: true,
                    });
                } else {
                    form.post(ProductController.store.url());
                }
            }}
            className="space-y-6"
        >
            <Panel title="Details">
                <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Name" htmlFor="name" error={errors.name}>
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
                        hint="Used in the product URL. Leave blank to generate."
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
                        label="Short description"
                        htmlFor="short_description"
                        error={errors.short_description}
                        className="md:col-span-2"
                    >
                        <Input
                            id="short_description"
                            value={data.short_description}
                            onChange={(event) =>
                                setData('short_description', event.target.value)
                            }
                            maxLength={255}
                        />
                    </FormField>
                    <FormField
                        label="Full description"
                        htmlFor="description"
                        error={errors.description}
                        className="md:col-span-2"
                    >
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(event) =>
                                setData('description', event.target.value)
                            }
                            rows={5}
                        />
                    </FormField>
                    <FormField
                        label="Illustration style"
                        error={errors.art_style}
                        hint="Used for the storefront mockup until you upload photos."
                    >
                        <Select
                            value={data.art_style}
                            onValueChange={(value) =>
                                setData(
                                    'art_style',
                                    value as Product['art_style'],
                                )
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {artStyles.map((style) => (
                                    <SelectItem
                                        key={style}
                                        value={style}
                                        className="capitalize"
                                    >
                                        {style}
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

            <Panel
                title="Pricing & production"
                description="Prices in pesos. Option prices are added per piece."
            >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <FormField
                        label="Base price (per piece)"
                        htmlFor="base_price"
                        error={errors.base_price}
                    >
                        <Input
                            id="base_price"
                            type="number"
                            step="0.01"
                            min={0}
                            value={data.base_price}
                            onChange={(event) =>
                                setData('base_price', event.target.value)
                            }
                        />
                    </FormField>
                    <FormField
                        label="Design service fee"
                        htmlFor="design_fee"
                        error={errors.design_fee}
                        hint="Charged once when Taptale designs it."
                    >
                        <Input
                            id="design_fee"
                            type="number"
                            step="0.01"
                            min={0}
                            value={data.design_fee}
                            onChange={(event) =>
                                setData('design_fee', event.target.value)
                            }
                        />
                    </FormField>
                    <FormField
                        label="Production days (min)"
                        htmlFor="production_days_min"
                        error={errors.production_days_min}
                    >
                        <Input
                            id="production_days_min"
                            type="number"
                            min={1}
                            value={data.production_days_min}
                            onChange={(event) =>
                                setData(
                                    'production_days_min',
                                    Number(event.target.value),
                                )
                            }
                        />
                    </FormField>
                    <FormField
                        label="Production days (max)"
                        htmlFor="production_days_max"
                        error={errors.production_days_max}
                    >
                        <Input
                            id="production_days_max"
                            type="number"
                            min={1}
                            value={data.production_days_max}
                            onChange={(event) =>
                                setData(
                                    'production_days_max',
                                    Number(event.target.value),
                                )
                            }
                        />
                    </FormField>
                    <FormField
                        label="Minimum quantity"
                        htmlFor="min_quantity"
                        error={errors.min_quantity}
                    >
                        <Input
                            id="min_quantity"
                            type="number"
                            min={1}
                            value={data.min_quantity}
                            onChange={(event) =>
                                setData(
                                    'min_quantity',
                                    Number(event.target.value),
                                )
                            }
                        />
                    </FormField>
                    <FormField
                        label="Maximum quantity"
                        htmlFor="max_quantity"
                        error={errors.max_quantity}
                    >
                        <Input
                            id="max_quantity"
                            type="number"
                            min={1}
                            value={data.max_quantity}
                            onChange={(event) =>
                                setData(
                                    'max_quantity',
                                    Number(event.target.value),
                                )
                            }
                        />
                    </FormField>
                    <FormField
                        label="Max customer photos"
                        htmlFor="max_photos"
                        error={errors.max_photos}
                    >
                        <Input
                            id="max_photos"
                            type="number"
                            min={1}
                            max={10}
                            value={data.max_photos}
                            onChange={(event) =>
                                setData(
                                    'max_photos',
                                    Number(event.target.value),
                                )
                            }
                        />
                    </FormField>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <CheckboxField
                        label="Available"
                        description="Customers can order it."
                        checked={data.is_active}
                        onChange={(value) => setData('is_active', value)}
                    />
                    <CheckboxField
                        label="Featured"
                        description="Shown on the homepage."
                        checked={data.is_featured}
                        onChange={(value) => setData('is_featured', value)}
                    />
                    <CheckboxField
                        label="Best seller"
                        description="Shown in best sellers."
                        checked={data.is_bestseller}
                        onChange={(value) => setData('is_bestseller', value)}
                    />
                    <CheckboxField
                        label="NFC / QR included"
                        description="Every order gets a memory page."
                        checked={data.has_digital_experience}
                        onChange={(value) =>
                            setData('has_digital_experience', value)
                        }
                    />
                </div>
            </Panel>

            <Panel title="Categories">
                <p className="mb-2 text-sm font-medium">Categories</p>
                <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                        <ChipToggle
                            key={category.id}
                            active={data.category_ids.includes(category.id)}
                            onClick={() =>
                                toggleId('category_ids', category.id)
                            }
                        >
                            {category.name}
                        </ChipToggle>
                    ))}
                </div>
                {errors.category_ids && (
                    <p className="mt-2 text-sm text-destructive">
                        {errors.category_ids}
                    </p>
                )}
            </Panel>

            <div className="flex justify-end">
                <Button type="submit" disabled={form.processing} size="lg">
                    {form.processing && (
                        <Loader2 className="size-4 animate-spin" />
                    )}
                    {product ? 'Save product' : 'Create product'}
                </Button>
            </div>
        </form>
    );
}

function ChipToggle({
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

function GalleryPanel({ product }: { product: Product }) {
    const form = useForm<{ images: File[] }>({ images: [] });
    const images = product.images ?? [];
    const imageError = Object.entries(form.errors).find(([key]) =>
        key.startsWith('images'),
    )?.[1];

    return (
        <Panel
            title="Gallery"
            description="The first image is the cover photo on the storefront."
        >
            {images.length > 0 && (
                <ul className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {images.map((image, position) => (
                        <li
                            key={image.id}
                            className="group relative aspect-square overflow-hidden rounded-xl border"
                        >
                            <img
                                src={image.url}
                                alt={image.alt ?? ''}
                                className="size-full object-cover"
                            />
                            {position === 0 && (
                                <span className="absolute top-1.5 left-1.5 rounded-full bg-plum px-2 py-0.5 text-[10px] font-semibold text-white">
                                    Cover
                                </span>
                            )}
                            <div className="absolute inset-x-1.5 bottom-1.5 flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                                {position > 0 && (
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="secondary"
                                        className="size-7"
                                        onClick={() =>
                                            router.put(
                                                ProductImageController.update.url(
                                                    {
                                                        product: product.slug,
                                                        image: image.id,
                                                    },
                                                ),
                                                {},
                                                { preserveScroll: true },
                                            )
                                        }
                                        aria-label="Make cover"
                                    >
                                        <Star className="size-3.5" />
                                    </Button>
                                )}
                                <ConfirmDelete
                                    title="Remove this image?"
                                    description="The image will be deleted from the gallery."
                                    url={ProductImageController.destroy.url({
                                        product: product.slug,
                                        image: image.id,
                                    })}
                                    trigger={
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="secondary"
                                            className="size-7"
                                            aria-label="Delete image"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    }
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post(ProductImageController.store.url(product.slug), {
                        forceFormData: true,
                        preserveScroll: true,
                        onSuccess: () => form.reset(),
                    });
                }}
                className="space-y-3"
            >
                <FileDropzone
                    id="product-images"
                    files={form.data.images}
                    onChange={(files) => form.setData('images', files)}
                    maxFiles={10}
                    maxKilobytes={6144}
                    label="Add product photos"
                    error={imageError}
                />
                {form.data.images.length > 0 && (
                    <Button type="submit" disabled={form.processing}>
                        {form.processing && (
                            <Loader2 className="size-4 animate-spin" />
                        )}{' '}
                        Upload {form.data.images.length}{' '}
                        {form.data.images.length === 1 ? 'image' : 'images'}
                    </Button>
                )}
            </form>
        </Panel>
    );
}

function OptionsPanel({
    product,
    optionGroups,
}: {
    product: Product;
    optionGroups: GroupOption[];
}) {
    const options = product.options ?? [];
    const [adding, setAdding] = useState(false);

    return (
        <Panel
            title="Options & add-ons"
            description="Sizes, shapes, materials, colors, thickness, NFC, packaging and add-ons. Prices are added per piece."
            action={
                !adding && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAdding(true)}
                    >
                        <Plus className="size-4" /> Add option
                    </Button>
                )
            }
        >
            {adding && (
                <OptionEditor
                    product={product}
                    optionGroups={optionGroups}
                    onDone={() => setAdding(false)}
                />
            )}
            <div className="space-y-6">
                {optionGroups
                    .filter((group) =>
                        options.some((option) => option.group === group.value),
                    )
                    .map((group) => (
                        <div key={group.value}>
                            <p className="mb-2 text-sm font-semibold">
                                {group.label}
                                <span className="ml-2 text-xs font-normal text-muted-foreground">
                                    {group.multiple
                                        ? 'Customer may pick several'
                                        : 'Customer picks one'}
                                </span>
                            </p>
                            <ul className="divide-y rounded-xl border">
                                {options
                                    .filter(
                                        (option) =>
                                            option.group === group.value,
                                    )
                                    .map((option) => (
                                        <OptionRow
                                            key={option.id}
                                            product={product}
                                            option={option}
                                            optionGroups={optionGroups}
                                        />
                                    ))}
                            </ul>
                        </div>
                    ))}
                {options.length === 0 && !adding && (
                    <p className="text-sm text-muted-foreground">
                        No options yet. Customers will order the base product.
                    </p>
                )}
            </div>
        </Panel>
    );
}

function OptionRow({
    product,
    option,
    optionGroups,
}: {
    product: Product;
    option: ProductOption;
    optionGroups: GroupOption[];
}) {
    const money = useMoney();
    const [editing, setEditing] = useState(false);

    if (editing) {
        return (
            <li className="p-3">
                <OptionEditor
                    product={product}
                    option={option}
                    optionGroups={optionGroups}
                    onDone={() => setEditing(false)}
                />
            </li>
        );
    }

    return (
        <li
            className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm',
                !option.is_active && 'opacity-50',
            )}
        >
            {option.swatch && (
                <span
                    className="size-5 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: option.swatch }}
                />
            )}
            <div className="min-w-0 flex-1">
                <p className="font-medium">
                    {option.name}
                    {option.is_default && (
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase">
                            Default
                        </span>
                    )}
                    {option.enables_digital_experience && (
                        <span className="ml-2 rounded-full bg-blush-light px-2 py-0.5 text-[10px] font-semibold text-plum uppercase">
                            NFC page
                        </span>
                    )}
                    {!option.is_active && (
                        <span className="ml-2 text-xs text-muted-foreground">
                            (hidden)
                        </span>
                    )}
                </p>
                {option.description && (
                    <p className="text-xs text-muted-foreground">
                        {option.description}
                    </p>
                )}
            </div>
            <span className="text-muted-foreground">
                {option.price_modifier === 0
                    ? 'Included'
                    : `${option.price_modifier > 0 ? '+' : ''}${money(option.price_modifier)}`}
            </span>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditing(true)}
                aria-label={`Edit ${option.name}`}
            >
                <Pencil className="size-4" />
            </Button>
            <ConfirmDelete
                title={`Remove "${option.name}"?`}
                description="Customers will no longer be able to choose it. Existing orders are not affected."
                url={ProductOptionController.destroy.url({
                    product: product.slug,
                    option: option.id,
                })}
            />
        </li>
    );
}

function OptionEditor({
    product,
    option,
    optionGroups,
    onDone,
}: {
    product: Product;
    option?: ProductOption;
    optionGroups: GroupOption[];
    onDone: () => void;
}) {
    const form = useForm({
        group: option?.group ?? 'size',
        name: option?.name ?? '',
        description: option?.description ?? '',
        price_modifier: toPesoInput(option?.price_modifier ?? 0),
        swatch: option?.swatch ?? '',
        enables_digital_experience: option?.enables_digital_experience ?? false,
        is_default: option?.is_default ?? false,
        is_active: option?.is_active ?? true,
        sort_order: option?.sort_order ?? product.options?.length ?? 0,
    });
    const { data, setData, errors } = form;

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: onDone };

        form.transform((values) => ({
            ...values,
            swatch: values.swatch || null,
        }));

        if (option) {
            form.put(
                ProductOptionController.update.url({
                    product: product.slug,
                    option: option.id,
                }),
                options,
            );
        } else {
            form.post(ProductOptionController.store.url(product.slug), options);
        }
    };

    return (
        <form
            onSubmit={submit}
            className="mb-4 space-y-3 rounded-xl border border-rose/30 bg-blush-light/20 p-4 dark:bg-rose/5"
        >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FormField label="Group" error={errors.group}>
                    <Select
                        value={data.group}
                        onValueChange={(value) =>
                            setData('group', value as ProductOption['group'])
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {optionGroups.map((group) => (
                                <SelectItem
                                    key={group.value}
                                    value={group.value}
                                >
                                    {group.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>
                <FormField
                    label="Name"
                    error={errors.name}
                    className="lg:col-span-2"
                >
                    <Input
                        value={data.name}
                        onChange={(event) =>
                            setData('name', event.target.value)
                        }
                        placeholder="e.g. Classic (55 mm)"
                        autoFocus
                    />
                </FormField>
                <FormField
                    label="Price per piece (₱)"
                    error={errors.price_modifier}
                >
                    <Input
                        type="number"
                        step="0.01"
                        value={data.price_modifier}
                        onChange={(event) =>
                            setData('price_modifier', event.target.value)
                        }
                    />
                </FormField>
                <FormField
                    label="Description"
                    error={errors.description}
                    className="lg:col-span-2"
                >
                    <Input
                        value={data.description}
                        onChange={(event) =>
                            setData('description', event.target.value)
                        }
                        placeholder="Optional helper text"
                    />
                </FormField>
                <FormField
                    label="Swatch color"
                    error={errors.swatch}
                    hint="For color options."
                >
                    <ColorInput
                        value={data.swatch}
                        onChange={(value) => setData('swatch', value)}
                    />
                </FormField>
                <FormField label="Sort order" error={errors.sort_order}>
                    <Input
                        type="number"
                        min={0}
                        value={data.sort_order}
                        onChange={(event) =>
                            setData('sort_order', Number(event.target.value))
                        }
                    />
                </FormField>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                    <Checkbox
                        checked={data.is_default}
                        onCheckedChange={(value) =>
                            setData('is_default', value === true)
                        }
                    />{' '}
                    Selected by default
                </label>
                <label className="flex items-center gap-2">
                    <Checkbox
                        checked={data.is_active}
                        onCheckedChange={(value) =>
                            setData('is_active', value === true)
                        }
                    />{' '}
                    Offered to customers
                </label>
                <label className="flex items-center gap-2">
                    <Checkbox
                        checked={data.enables_digital_experience}
                        onCheckedChange={(value) =>
                            setData(
                                'enables_digital_experience',
                                value === true,
                            )
                        }
                    />{' '}
                    Includes NFC/QR memory page
                </label>
            </div>
            <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={form.processing}>
                    {form.processing ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Check className="size-4" />
                    )}{' '}
                    {option ? 'Save option' : 'Add option'}
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={onDone}
                >
                    <X className="size-4" /> Cancel
                </Button>
            </div>
        </form>
    );
}
