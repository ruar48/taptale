import { Head, useForm } from "@inertiajs/react";
import { Loader2 } from "lucide-react";
import OrderController from "@/actions/App/Http/Controllers/Admin/OrderController";
import {
    AdminPage,
    CheckboxField,
    FormField,
    PageHeader,
} from "@/components/taptale/admin-ui";
import { Panel } from "@/components/taptale/order-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMoney } from "@/hooks/use-money";
import { formatModifier, toPesoInput } from "@/lib/money";
import { cn } from "@/lib/utils";
import { create, index as ordersIndex } from "@/routes/admin/orders";
import type { PaymentMethod, Product, ProductOption } from "@/types";

type Props = {
    channels: { value: string; label: string }[];
    products: Product[];
    paymentMethods: PaymentMethod[];
    defaultDeliveryFee: number;
    templates: { value: string; label: string; description: string }[];
    initialTemplate: string | null;
};

type ManualOrderForm = {
    channel: string;
    product_id: string;
    option_ids: number[];
    quantity: string;
    charge_design_fee: boolean;
    experience_template: string;
    delivery_fee: string;
    personalization: {
        names: string;
        date: string;
        message: string;
        design_brief: string;
    };
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    address_line: string;
    city: string;
    province: string;
    postal_code: string;
    customer_notes: string;
    payment_method_id: string;
    is_paid: boolean;
};

/**
 * Take an order for a walk-in customer or someone who ordered over Messenger.
 */
export default function AdminOrderCreate({
    channels,
    products,
    paymentMethods,
    defaultDeliveryFee,
    templates,
    initialTemplate,
}: Props) {
    const money = useMoney();
    /*
     * The customer already picked their keychain at the counter or in chat,
     * so the form starts on the usual one and the website comes first.
     */
    const defaultProduct =
        products.find((candidate) => candidate.is_active) ?? products[0];
    const form = useForm<ManualOrderForm>({
        channel: "messenger",
        product_id: defaultProduct ? String(defaultProduct.id) : "",
        option_ids: (defaultProduct?.options ?? [])
            .filter((option) => option.is_default && !option.multiple)
            .map((option) => option.id),
        quantity: "1",
        charge_design_fee: false,
        experience_template: initialTemplate ?? templates[0]?.value ?? "",
        delivery_fee: toPesoInput(defaultDeliveryFee),
        personalization: { names: "", date: "", message: "", design_brief: "" },
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        address_line: "",
        city: "",
        province: "",
        postal_code: "",
        customer_notes: "",
        payment_method_id: "",
        is_paid: false,
    });
    const errors = form.errors as Record<string, string | undefined>;

    const product = products.find(
        (candidate) => String(candidate.id) === form.data.product_id,
    );
    const options = product?.options ?? [];
    const groups = Object.values(
        options.reduce<Record<string, ProductOption[]>>((grouped, option) => {
            (grouped[option.group] ??= []).push(option);

            return grouped;
        }, {}),
    );
    const chosenOptions = options.filter((option) =>
        form.data.option_ids.includes(option.id),
    );
    const quantity = Math.max(0, Number.parseInt(form.data.quantity, 10) || 0);
    const unitPrice = product
        ? Math.max(
              0,
              product.base_price +
                  chosenOptions.reduce(
                      (sum, option) => sum + option.price_modifier,
                      0,
                  ),
          )
        : 0;
    const designFee =
        product && form.data.charge_design_fee ? product.design_fee : 0;
    const deliveryFee = Math.round(
        (Number.parseFloat(form.data.delivery_fee) || 0) * 100,
    );
    const total = unitPrice * quantity + designFee + deliveryFee;

    const chooseProduct = (productId: string) => {
        const next = products.find(
            (candidate) => String(candidate.id) === productId,
        );

        form.setData((data) => ({
            ...data,
            product_id: productId,
            option_ids: (next?.options ?? [])
                .filter((option) => option.is_default && !option.multiple)
                .map((option) => option.id),
        }));
    };

    const toggleOption = (option: ProductOption, group: ProductOption[]) => {
        const groupIds = group.map((candidate) => candidate.id);
        const selected = form.data.option_ids.includes(option.id);

        form.setData(
            "option_ids",
            option.multiple
                ? selected
                    ? form.data.option_ids.filter((id) => id !== option.id)
                    : [...form.data.option_ids, option.id]
                : [
                      ...form.data.option_ids.filter(
                          (id) => !groupIds.includes(id),
                      ),
                      option.id,
                  ],
        );
    };

    const chooseChannel = (channel: string) =>
        form.setData((data) => ({
            ...data,
            channel,
            delivery_fee:
                channel === "walk_in" ? "0" : toPesoInput(defaultDeliveryFee),
        }));

    return (
        <>
            <Head title="New order" />
            <AdminPage>
                <PageHeader
                    title="New order"
                    description="For walk-in customers and orders taken over Messenger or chat. The customer doesn't need an account: you get a link to send them so they can approve the design."
                />

                <form
                    className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.transform((data) => ({
                            ...data,
                            payment_method_id: data.payment_method_id || null,
                        }));
                        form.post(OrderController.store.url());
                    }}
                >
                    <div className="space-y-6">
                        <Panel
                            title="Website template"
                            description="The website the keychain opens. After saving, send the customer the edit link so they can add their photos and words."
                        >
                            <div className="grid gap-2 sm:grid-cols-2">
                                {templates.map((template) => {
                                    const isChosen =
                                        form.data.experience_template ===
                                        template.value;

                                    return (
                                        <button
                                            key={template.value}
                                            type="button"
                                            onClick={() =>
                                                form.setData(
                                                    "experience_template",
                                                    template.value,
                                                )
                                            }
                                            aria-pressed={isChosen}
                                            className={cn(
                                                "rounded-xl border p-3 text-left transition",
                                                isChosen
                                                    ? "border-plum bg-blush-light/60 ring-1 ring-plum dark:bg-plum/20"
                                                    : "hover:border-plum/40",
                                            )}
                                        >
                                            <p className="text-sm font-medium">
                                                {template.label}
                                            </p>
                                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                                {template.description}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                            {errors.experience_template && (
                                <p className="mt-2 text-sm text-destructive">
                                    {errors.experience_template}
                                </p>
                            )}
                        </Panel>

                        <Panel title="Customer">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField
                                    label="Ordered through"
                                    error={errors.channel}
                                >
                                    <Select
                                        value={form.data.channel}
                                        onValueChange={chooseChannel}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {channels.map((channel) => (
                                                <SelectItem
                                                    key={channel.value}
                                                    value={channel.value}
                                                >
                                                    {channel.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormField>
                                <FormField
                                    label="Name"
                                    htmlFor="customer_name"
                                    error={errors.customer_name}
                                >
                                    <Input
                                        id="customer_name"
                                        value={form.data.customer_name}
                                        onChange={(event) =>
                                            form.setData(
                                                "customer_name",
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                </FormField>
                                <FormField
                                    label="Phone"
                                    htmlFor="customer_phone"
                                    error={errors.customer_phone}
                                    hint="A phone number or an email is required."
                                >
                                    <Input
                                        id="customer_phone"
                                        type="tel"
                                        value={form.data.customer_phone}
                                        onChange={(event) =>
                                            form.setData(
                                                "customer_phone",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                                <FormField
                                    label="Email (optional)"
                                    htmlFor="customer_email"
                                    error={errors.customer_email}
                                >
                                    <Input
                                        id="customer_email"
                                        type="email"
                                        value={form.data.customer_email}
                                        onChange={(event) =>
                                            form.setData(
                                                "customer_email",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                            </div>
                        </Panel>

                        <Panel title="Gift">
                            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
                                <FormField
                                    label="Product"
                                    error={errors.product_id}
                                >
                                    <Select
                                        value={form.data.product_id}
                                        onValueChange={chooseProduct}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose a product" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {products.map((candidate) => (
                                                <SelectItem
                                                    key={candidate.id}
                                                    value={String(candidate.id)}
                                                >
                                                    {candidate.name} ·{" "}
                                                    {money(candidate.base_price)}
                                                    {!candidate.is_active &&
                                                        " (hidden)"}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormField>
                                <FormField
                                    label="Quantity"
                                    htmlFor="quantity"
                                    error={errors.quantity}
                                >
                                    <Input
                                        id="quantity"
                                        type="number"
                                        min={1}
                                        max={1000}
                                        value={form.data.quantity}
                                        onChange={(event) =>
                                            form.setData(
                                                "quantity",
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                </FormField>
                            </div>

                            {groups.length > 0 && (
                                <div className="mt-5 space-y-4">
                                    {groups.map((group) => (
                                        <div key={group[0].group}>
                                            <p className="text-sm font-medium">
                                                {group[0].group_label}
                                                {group[0].multiple && (
                                                    <span className="font-normal text-muted-foreground">
                                                        {" "}
                                                        (any)
                                                    </span>
                                                )}
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {group.map((option) => {
                                                    const selected =
                                                        form.data.option_ids.includes(
                                                            option.id,
                                                        );

                                                    return (
                                                        <button
                                                            key={option.id}
                                                            type="button"
                                                            aria-pressed={
                                                                selected
                                                            }
                                                            onClick={() =>
                                                                toggleOption(
                                                                    option,
                                                                    group,
                                                                )
                                                            }
                                                            className={cn(
                                                                "rounded-full border px-3 py-1.5 text-sm transition",
                                                                selected
                                                                    ? "border-plum bg-plum text-white dark:border-blush dark:bg-blush dark:text-plum-dark"
                                                                    : "bg-card hover:border-rose",
                                                            )}
                                                        >
                                                            {option.name}
                                                            {option.price_modifier !==
                                                                0 &&
                                                                ` ${formatModifier(option.price_modifier)}`}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                    {errors.option_ids && (
                                        <p className="text-sm text-destructive">
                                            {errors.option_ids}
                                        </p>
                                    )}
                                </div>
                            )}
                        </Panel>

                        <Panel
                            title="Delivery address"
                            description="Leave blank for pickups."
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField
                                    label="Street address"
                                    htmlFor="address_line"
                                    error={errors.address_line}
                                    className="sm:col-span-2"
                                >
                                    <Input
                                        id="address_line"
                                        value={form.data.address_line}
                                        onChange={(event) =>
                                            form.setData(
                                                "address_line",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                                <FormField
                                    label="City"
                                    htmlFor="city"
                                    error={errors.city}
                                >
                                    <Input
                                        id="city"
                                        value={form.data.city}
                                        onChange={(event) =>
                                            form.setData(
                                                "city",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                                <FormField
                                    label="Province"
                                    htmlFor="province"
                                    error={errors.province}
                                >
                                    <Input
                                        id="province"
                                        value={form.data.province}
                                        onChange={(event) =>
                                            form.setData(
                                                "province",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                                <FormField
                                    label="Postal code"
                                    htmlFor="postal_code"
                                    error={errors.postal_code}
                                >
                                    <Input
                                        id="postal_code"
                                        value={form.data.postal_code}
                                        onChange={(event) =>
                                            form.setData(
                                                "postal_code",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </FormField>
                            </div>
                        </Panel>
                    </div>

                    <div className="space-y-6">
                        <Panel title="Price & payment">
                            <div className="space-y-4">
                                <FormField
                                    label="Delivery fee (₱)"
                                    htmlFor="delivery_fee"
                                    error={errors.delivery_fee}
                                >
                                    <Input
                                        id="delivery_fee"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={form.data.delivery_fee}
                                        onChange={(event) =>
                                            form.setData(
                                                "delivery_fee",
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                </FormField>
                                <FormField
                                    label="Payment method"
                                    error={errors.payment_method_id}
                                >
                                    <Select
                                        value={form.data.payment_method_id}
                                        onValueChange={(value) =>
                                            form.setData(
                                                "payment_method_id",
                                                value,
                                            )
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Not decided yet" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {paymentMethods.map((method) => (
                                                <SelectItem
                                                    key={method.id}
                                                    value={String(method.id)}
                                                >
                                                    {method.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </FormField>
                                <CheckboxField
                                    label="Already paid in full"
                                    description="Records the full amount as received. Otherwise record payments from the order page later."
                                    checked={form.data.is_paid}
                                    onChange={(checked) =>
                                        form.setData("is_paid", checked)
                                    }
                                />
                                <FormField
                                    label="Internal notes (optional)"
                                    htmlFor="customer_notes"
                                    error={errors.customer_notes}
                                >
                                    <Textarea
                                        id="customer_notes"
                                        rows={2}
                                        value={form.data.customer_notes}
                                        onChange={(event) =>
                                            form.setData(
                                                "customer_notes",
                                                event.target.value,
                                            )
                                        }
                                        placeholder="e.g. Pickup on Saturday"
                                    />
                                </FormField>
                            </div>

                            <dl className="mt-5 space-y-1.5 border-t pt-4 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">
                                        Items ({quantity} ×{" "}
                                        {money(unitPrice)})
                                    </dt>
                                    <dd>{money(unitPrice * quantity)}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">
                                        Design fee
                                    </dt>
                                    <dd>{money(designFee)}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">
                                        Delivery
                                    </dt>
                                    <dd>{money(deliveryFee)}</dd>
                                </div>
                                <div className="flex justify-between pt-1.5 text-base font-medium">
                                    <dt>Total</dt>
                                    <dd>{money(total)}</dd>
                                </div>
                            </dl>

                            <Button
                                type="submit"
                                className="mt-5 w-full"
                                disabled={form.processing}
                            >
                                {form.processing && (
                                    <Loader2 className="size-4 animate-spin" />
                                )}{" "}
                                Create order
                            </Button>
                        </Panel>
                    </div>
                </form>
            </AdminPage>
        </>
    );
}

AdminOrderCreate.layout = {
    breadcrumbs: [
        { title: "Orders", href: ordersIndex() },
        { title: "New order", href: create() },
    ],
};
