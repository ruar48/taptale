import { Head, Link, router } from '@inertiajs/react';
import { Eye, EyeOff, Star } from 'lucide-react';
import ReviewController from '@/actions/App/Http/Controllers/Admin/ReviewController';
import {
    AdminPage,
    ConfirmDelete,
    PageHeader,
} from '@/components/taptale/admin-ui';
import { Pagination } from '@/components/taptale/pagination';
import { StatusBadge } from '@/components/taptale/status-badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/money';
import { cn } from '@/lib/utils';
import { show as orderShow } from '@/routes/admin/orders';
import { index } from '@/routes/admin/reviews';
import type { SimplePaginated } from '@/types';

type Review = {
    id: number;
    author_name: string;
    occasion: string | null;
    quote: string;
    rating: number;
    is_published: boolean;
    order: { reference: string; product_name: string } | null;
    created_at: string | null;
};

export default function AdminReviews({
    reviews,
    pendingCount,
}: {
    reviews: SimplePaginated<Review>;
    pendingCount: number;
}) {
    const setPublished = (review: Review, isPublished: boolean) =>
        router.put(
            ReviewController.update.url(review.id),
            { is_published: isPublished },
            { preserveScroll: true },
        );

    return (
        <>
            <Head title="Reviews" />
            <AdminPage>
                <PageHeader
                    title="Reviews"
                    description={
                        pendingCount > 0
                            ? `${pendingCount} waiting for your approval. Published reviews appear on the storefront.`
                            : 'Published reviews appear on the storefront.'
                    }
                />

                {reviews.data.length === 0 ? (
                    <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                        No reviews yet. Customers can review an order once it
                        ships.
                    </p>
                ) : (
                    <ul className="grid gap-4 md:grid-cols-2">
                        {reviews.data.map((review) => (
                            <li
                                key={review.id}
                                className={cn(
                                    'flex flex-col rounded-2xl border bg-card p-5',
                                    !review.is_published &&
                                        'border-amber-300 dark:border-amber-700',
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div
                                        className="flex gap-0.5 text-amber-400"
                                        aria-label={`${review.rating} out of 5`}
                                    >
                                        {[1, 2, 3, 4, 5].map((value) => (
                                            <Star
                                                key={value}
                                                className={cn(
                                                    'size-4',
                                                    value <= review.rating &&
                                                        'fill-current',
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <StatusBadge
                                        tone={
                                            review.is_published
                                                ? 'emerald'
                                                : 'amber'
                                        }
                                    >
                                        {review.is_published
                                            ? 'Published'
                                            : 'Waiting'}
                                    </StatusBadge>
                                </div>
                                <p className="mt-3 flex-1 text-sm whitespace-pre-line">
                                    “{review.quote}”
                                </p>
                                <p className="mt-3 text-xs text-muted-foreground">
                                    — {review.author_name}
                                    {review.occasion && ` · ${review.occasion}`}
                                    {review.created_at &&
                                        ` · ${formatDate(review.created_at)}`}
                                    {review.order && (
                                        <>
                                            {' · '}
                                            <Link
                                                href={orderShow(
                                                    review.order.reference,
                                                )}
                                                className="font-medium text-plum hover:underline dark:text-blush"
                                            >
                                                {review.order.reference}
                                            </Link>
                                        </>
                                    )}
                                </p>
                                <div className="mt-4 flex justify-end gap-1 border-t pt-3">
                                    <Button
                                        size="sm"
                                        variant={
                                            review.is_published
                                                ? 'outline'
                                                : 'default'
                                        }
                                        onClick={() =>
                                            setPublished(
                                                review,
                                                !review.is_published,
                                            )
                                        }
                                    >
                                        {review.is_published ? (
                                            <>
                                                <EyeOff className="size-4" />{' '}
                                                Hide
                                            </>
                                        ) : (
                                            <>
                                                <Eye className="size-4" />{' '}
                                                Publish
                                            </>
                                        )}
                                    </Button>
                                    <ConfirmDelete
                                        title="Delete this review?"
                                        description="It will be removed for good."
                                        url={ReviewController.destroy.url(
                                            review.id,
                                        )}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                <Pagination links={reviews.links} />
            </AdminPage>
        </>
    );
}

AdminReviews.layout = {
    breadcrumbs: [{ title: 'Reviews', href: index() }],
};
