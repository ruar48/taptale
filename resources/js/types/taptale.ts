export type CategorySummary = {
    id: number;
    name: string;
    slug: string;
    accent_color: string;
};

export type Category = CategorySummary & {
    tagline: string | null;
    description: string | null;
    image_url: string | null;
    icon: string;
    sort_order: number;
    is_active: boolean;
    products_count?: number;
};

export type OptionGroupValue =
    | 'size'
    | 'shape'
    | 'material'
    | 'color'
    | 'thickness'
    | 'nfc'
    | 'packaging'
    | 'addon';

export type ProductOption = {
    id: number;
    group: OptionGroupValue;
    group_label: string;
    multiple: boolean;
    name: string;
    description: string | null;
    price_modifier: number;
    swatch: string | null;
    enables_digital_experience: boolean;
    is_default: boolean;
    is_active: boolean;
    sort_order: number;
};

export type ArtStyle = 'acrylic' | 'nfc' | 'qr' | 'photo' | 'keepsake';

export type Product = {
    id: number;
    name: string;
    slug: string;
    short_description: string | null;
    description: string | null;
    art_style: ArtStyle;
    base_price: number;
    design_fee: number;
    production_days_min: number;
    production_days_max: number;
    production_time: string;
    min_quantity: number;
    max_quantity: number;
    max_photos: number;
    has_digital_experience: boolean;
    is_active: boolean;
    is_featured: boolean;
    is_bestseller: boolean;
    sort_order: number;
    cover_image_url?: string | null;
    images?: { id: number; url: string; alt: string | null }[];
    options?: ProductOption[];
    categories?: { id: number; name: string; slug: string }[];
    template_ids?: number[];
    orders_count?: number;
};

export type TemplateLayout =
    | 'polaroid'
    | 'heart'
    | 'arch'
    | 'celestial'
    | 'floral'
    | 'minimal';

export type Palette = {
    background: string;
    ink: string;
    accent: string;
};

export type Template = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    layout: TemplateLayout;
    layout_label: string;
    palette: Palette;
    preview_url: string | null;
    mockup_url: string | null;
    is_active: boolean;
    is_featured: boolean;
    sort_order: number;
    categories?: { id: number; name: string; slug: string }[];
    product_ids?: number[];
};

export type PaymentMethod = {
    id: number;
    name: string;
    code: string;
    driver: string;
    account_name: string | null;
    account_number: string | null;
    instructions: string | null;
    is_active: boolean;
    sort_order: number;
};

export type StatusTone = 'amber' | 'sky' | 'rose' | 'plum' | 'emerald' | 'zinc';

export type StatusOption = {
    value: string;
    label: string;
    tone: StatusTone;
};

export type OrderFile = {
    id: number;
    kind: 'photo' | 'reference' | 'additional';
    kind_label: string;
    original_name: string;
    mime_type: string;
    size: number;
    is_image: boolean;
    url: string;
    created_at: string;
};

export type DesignProof = {
    id: number;
    version: number;
    status: 'awaiting_response' | 'approved' | 'revision_requested';
    status_label: string;
    designer_notes: string | null;
    customer_comment: string | null;
    responded_at: string | null;
    image_url: string;
    created_at: string;
};

export type OrderActivity = {
    id: number;
    type: string;
    status: string | null;
    status_label: string | null;
    body: string | null;
    is_internal: boolean;
    author?: string | null;
    created_at: string;
};

export type Payment = {
    id: number;
    kind: 'payment' | 'refund';
    kind_label: string;
    status: 'submitted' | 'verified' | 'rejected';
    status_label: string;
    amount: number;
    reference_number: string | null;
    notes: string | null;
    method?: string | null;
    proof_url: string | null;
    review_notes: string | null;
    reviewed_at: string | null;
    created_at: string;
    order?: {
        reference: string;
        customer_name: string;
        total: number;
        status_label: string;
    };
};

export type DigitalExperience = {
    code: string;
    title: string;
    subtitle: string | null;
    message: string | null;
    event_date: string | null;
    video_url: string | null;
    music_url: string | null;
    theme: string;
    photos: { index: number; url: string }[];
    nfc_tag_uid: string | null;
    is_published: boolean;
    view_count: number;
    public_url: string;
    qr_url: string;
};

export type Personalization = {
    names?: string;
    date?: string;
    message?: string;
    color?: string;
    design_brief?: string;
    instructions?: string;
};

export type SelectedOption = {
    id: number;
    group: string;
    group_label: string;
    name: string;
    price_modifier: number;
};

export type Order = {
    id: number;
    reference: string;
    status: string;
    status_label: string;
    status_tone: StatusTone;
    stage: number;
    design_mode: 'self' | 'assisted';
    design_mode_label: string;
    product_name: string;
    product_slug?: string | null;
    product_art_style?: ArtStyle | null;
    category_name?: string | null;
    template_name: string | null;
    template?: Template | null;
    selected_options: SelectedOption[];
    personalization: Personalization;
    preview_approved_at: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
    customization_fee: number;
    delivery_fee: number;
    adjustment: number;
    adjustment_note: string | null;
    total: number;
    amount_paid?: number;
    balance_due?: number;
    is_design_approved?: boolean;
    can_cancel: boolean;
    accepts_payment: boolean;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    address_line: string;
    city: string;
    province: string;
    postal_code: string;
    customer_notes: string | null;
    courier: string | null;
    tracking_number: string | null;
    payment_method?: PaymentMethod | null;
    files?: OrderFile[];
    proofs?: DesignProof[];
    activities?: OrderActivity[];
    payments?: Payment[];
    experience?: DigitalExperience | null;
    user?: { id: number; name: string; email: string };
    created_at: string;
    updated_at: string;
};

export type Testimonial = {
    id: number;
    author_name: string;
    occasion: string | null;
    quote: string;
    rating: number;
};

export type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

export type Paginated<T> = {
    data: T[];
    links: {
        first: string | null;
        last: string | null;
        prev: string | null;
        next: string | null;
    };
    meta: {
        current_page: number;
        from: number | null;
        last_page: number;
        links: PaginationLink[];
        per_page: number;
        to: number | null;
        total: number;
    };
};

export type SimplePaginated<T> = {
    data: T[];
    current_page: number;
    from: number | null;
    last_page: number;
    links: PaginationLink[];
    per_page: number;
    to: number | null;
    total: number;
};
