import { useForm } from "@inertiajs/react";
import { BadgeCheck, Clock, Lock, MessageSquareText } from "lucide-react";
import { useState } from "react";
import InputError from "@/components/input-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/money";
import type { DesignProof } from "@/types";

/**
 * The newest design proof with "Approve" and "Request changes", used on the
 * customer's order page and on the approval link the studio shares.
 */
export function ProofApproval({
    proof,
    approveUrl,
    revisionUrl,
}: {
    proof: DesignProof;
    approveUrl: string;
    revisionUrl: string;
}) {
    const [mode, setMode] = useState<"idle" | "revise">("idle");
    const [confirmApprove, setConfirmApprove] = useState(false);
    const [understandsFinal, setUnderstandsFinal] = useState(false);
    const form = useForm({ comment: "" });

    return (
        <section className="overflow-hidden rounded-2xl border-2 border-rose/50 bg-card shadow-[0_20px_50px_-30px_rgb(184_111_131/0.8)]">
            <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <a
                    href={proof.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block bg-muted"
                >
                    <img
                        src={proof.image_url}
                        alt={`Design version ${proof.version}`}
                        className="mx-auto max-h-[480px] w-full object-contain"
                    />
                </a>
                <div className="flex flex-col p-5 sm:p-6">
                    <p className="text-xs font-semibold tracking-[0.2em] text-rose uppercase">
                        Design v{proof.version} is ready
                    </p>
                    <h2 className="mt-1 font-display text-2xl">
                        Do you love it?
                    </h2>
                    {proof.designer_notes && (
                        <div className="mt-4 flex gap-3 rounded-xl bg-muted/60 p-4 text-sm">
                            <MessageSquareText className="size-5 shrink-0 text-rose" />
                            <p className="whitespace-pre-line">
                                {proof.designer_notes}
                            </p>
                        </div>
                    )}
                    <p className="mt-4 text-sm text-muted-foreground">
                        Please check names, dates, spelling and photo placement.
                        Production starts once you approve, and{" "}
                        <span className="font-medium text-foreground">
                            approval is final
                        </span>{" "}
                        — the design can't be changed after that.
                    </p>
                    {proof.auto_approves_at && (
                        <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
                            <Clock className="mt-0.5 size-4 shrink-0" />
                            <span>
                                Please reply by{" "}
                                <span className="font-semibold">
                                    {formatDate(proof.auto_approves_at, true)}
                                </span>
                                . If we don't hear from you by then, this design
                                is approved automatically and goes into
                                production.
                            </span>
                        </p>
                    )}

                    {mode === "revise" ? (
                        <form
                            className="mt-5 space-y-3"
                            onSubmit={(event) => {
                                event.preventDefault();
                                form.post(revisionUrl, { preserveScroll: true });
                            }}
                        >
                            <Label htmlFor="revision-comment">
                                What would you like us to change?
                            </Label>
                            <Textarea
                                id="revision-comment"
                                value={form.data.comment}
                                onChange={(event) =>
                                    form.setData("comment", event.target.value)
                                }
                                rows={4}
                                placeholder="e.g. Please make the names bigger and use the second photo."
                                autoFocus
                            />
                            <InputError
                                message={
                                    form.errors.comment ??
                                    (form.errors as Record<string, string>)
                                        .proof
                                }
                            />
                            <div className="flex gap-2">
                                <Button
                                    type="submit"
                                    disabled={form.processing}
                                    className="flex-1 rounded-full"
                                >
                                    Send revision request
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setMode("idle")}
                                    className="rounded-full"
                                >
                                    Back
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <div className="mt-auto grid gap-2 pt-6 sm:grid-cols-2">
                            <Button
                                disabled={form.processing}
                                onClick={() => {
                                    setUnderstandsFinal(false);
                                    setConfirmApprove(true);
                                }}
                                className="h-11 rounded-full bg-plum text-white hover:bg-plum-dark dark:bg-blush dark:text-plum-dark"
                            >
                                <BadgeCheck className="size-4" /> Approve design
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setMode("revise")}
                                className="h-11 rounded-full"
                            >
                                Request changes
                            </Button>
                            <InputError
                                message={
                                    (form.errors as Record<string, string>)
                                        .proof
                                }
                                className="sm:col-span-2"
                            />
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={confirmApprove} onOpenChange={setConfirmApprove}>
                <DialogContent>
                    <DialogTitle>
                        Approve design v{proof.version} as final?
                    </DialogTitle>
                    <DialogDescription>
                        We make your gift exactly as this design shows. After
                        you approve, it can't be changed, and mistakes in an
                        approved design can't be returned or refunded.
                    </DialogDescription>
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                        <Checkbox
                            checked={understandsFinal}
                            onCheckedChange={(checked) =>
                                setUnderstandsFinal(checked === true)
                            }
                            className="mt-0.5"
                        />
                        <span>
                            I've checked the names, dates, spelling and photos,
                            and I understand my approved design is final.
                        </span>
                    </label>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Not yet</Button>
                        </DialogClose>
                        <Button
                            disabled={!understandsFinal || form.processing}
                            onClick={() =>
                                form.post(approveUrl, {
                                    preserveScroll: true,
                                    onFinish: () => setConfirmApprove(false),
                                })
                            }
                            className="bg-plum text-white hover:bg-plum-dark dark:bg-blush dark:text-plum-dark"
                        >
                            <Lock className="size-4" /> Approve — it's final
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}
