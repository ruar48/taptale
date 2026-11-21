import { Head, Link } from '@inertiajs/react';
import { Eye, X } from 'lucide-react';
import { useState } from 'react';
import { SectionHeading } from '@/components/taptale/section-heading';
import { TemplatePreview } from '@/components/taptale/template-preview';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { create as startOrder } from '@/routes/orders';
import type { Category, Template } from '@/types';

export default function TemplatesGallery({
    templates,
    categories,
}: {
    templates: Template[];
    categories: Category[];
}) {
    const [filter, setFilter] = useState<string | null>(null);
    const [previewing, setPreviewing] = useState<Template | null>(null);

    const visible = filter
        ? templates.filter((template) =>
              template.categories?.some((category) => category.slug === filter),
          )
        : templates;

    return (
        <>
            <Head title="Design templates" />
            <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
                <SectionHeading
                    eyebrow="Design templates"
                    title="Find the design that feels like them"
                    description="Every template is a starting point. Add your photos, names and message — or ask our designers to adapt it for you."
                />

                <div className="scrollbar-none mt-8 -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
                    <FilterChip active={filter === null} onClick={() => setFilter(null)}>
                        All designs
                    </FilterChip>
                    {categories.map((category) => (
                        <FilterChip
                            key={category.id}
                            active={filter === category.slug}
                            onClick={() => setFilter(category.slug)}
                        >
                            {category.name}
                        </FilterChip>
                    ))}
                </div>

                <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                    {visible.map((template) => (
                        <button
                            key={template.id}
                            type="button"
                            onClick={() => setPreviewing(template)}
                            className="group text-left"
                        >
                            <div className="relative overflow-hidden rounded-3xl shadow-[0_18px_36px_-24px_rgb(113_61_80/0.55)] transition-transform duration-300 group-hover:-translate-y-1">
                                <TemplatePreview
                                    layout={template.layout}
                                    palette={template.palette}
                                    imageUrl={template.preview_url}
                                />
                                <span className="absolute inset-0 flex items-center justify-center bg-charcoal/0 opacity-0 transition group-hover:bg-charcoal/25 group-hover:opacity-100">
                                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-plum">
                                        <Eye className="size-4" /> Preview
                                    </span>
                                </span>
                            </div>
                            <p className="mt-3 font-display text-lg">{template.name}</p>
                            <p className="line-clamp-1 text-sm text-muted-foreground">
                                {template.categories?.map((category) => category.name).join(' · ')}
                            </p>
                        </button>
                    ))}
                </div>
                {visible.length === 0 && (
                    <p className="mt-10 rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
                        No templates for this occasion yet.
                    </p>
                )}
            </section>

            <Dialog open={previewing !== null} onOpenChange={(open) => !open && setPreviewing(null)}>
                <DialogContent className="max-w-3xl overflow-hidden p-0 sm:rounded-3xl [&>button]:hidden">
                    {previewing && (
                        <div className="grid sm:grid-cols-2">
                            <div className="bg-blush-light p-6">
                                <TemplatePreview
                                    layout={previewing.layout}
                                    palette={previewing.palette}
                                    imageUrl={previewing.preview_url}
                                    className="rounded-2xl shadow-lg"
                                />
                                {previewing.mockup_url && (
                                    <img
                                        src={previewing.mockup_url}
                                        alt={`${previewing.name} product mockup`}
                                        className="mt-4 w-full rounded-2xl"
                                    />
                                )}
                            </div>
                            <div className="flex flex-col p-6">
                                <button
                                    type="button"
                                    onClick={() => setPreviewing(null)}
                                    className="ml-auto rounded-full p-1.5 hover:bg-muted"
                                    aria-label="Close preview"
                                >
                                    <X className="size-5" />
                                </button>
                                <DialogTitle className="font-display text-3xl font-medium">
                                    {previewing.name}
                                </DialogTitle>
                                <DialogDescription className="mt-2">
                                    {previewing.description ?? previewing.layout_label}
                                </DialogDescription>
                                <div className="mt-4 flex gap-2">
                                    {Object.values(previewing.palette).map((color) => (
                                        <span
                                            key={color}
                                            className="size-7 rounded-full ring-1 ring-black/10"
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                                <p className="mt-6 text-sm font-medium">Perfect for</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {previewing.categories?.map((category) => (
                                        <Button
                                            key={category.id}
                                            asChild
                                            variant="outline"
                                            size="sm"
                                            className="rounded-full"
                                        >
                                            <Link href={startOrder({ query: { category: category.slug, template: previewing.slug } })}>
                                                {category.name}
                                            </Link>
                                        </Button>
                                    ))}
                                </div>
                                <p className="mt-auto pt-6 text-xs text-muted-foreground">
                                    Choose an occasion above to start a gift
                                    with this template.
                                </p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

function FilterChip({
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
                'shrink-0 rounded-full border px-4 py-2 text-sm whitespace-nowrap transition-colors',
                active
                    ? 'border-plum bg-plum text-white dark:border-blush dark:bg-blush dark:text-plum-dark'
                    : 'border-border bg-card hover:border-rose',
            )}
        >
            {children}
        </button>
    );
}
