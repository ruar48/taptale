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

export type ArtStyle =
    | 'acrylic'
    | 'nfc'
    | 'qr'
    | 'photo'
    | 'keepsake'
    | 'cd'
    | 'music'
    | 'strip'
    | 'tag'
    | 'wood'
    | 'diecut'
    | 'calendar';

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
    design_layout: TemplateLayout;
    orders_count?: number;
};

export type TemplateLayout =
    | 'polaroid'
    | 'heart'
    | 'arch'
    | 'celestial'
    | 'floral'
    | 'minimal'
    | 'mini_cd'
    | 'music_player'
    | 'photo_strip'
    | 'tap_tag'
    | 'engraved'
    | 'die_cut'
    | 'calendar';

export type Palette = {
    background: string;
    ink: string;
    accent: string;
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
    auto_approves_at: string | null;
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
    status: 'pending' | 'submitted' | 'verified' | 'rejected' | 'expired';
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

/** Whether raining photos fall in front of the garden flowers or behind them. */
export type PhotoRainLayer = 'front' | 'back';

/** The flowers on a bouquet page: the wrapped bouquet or glowing garden flowers. */
export type FlowerStyle =
    | 'bouquet'
    | 'lotus'
    | 'heart'
    | 'crimson'
    | 'teal'
    | 'pink'
    | 'lavender'
    | 'golden'
    | 'red'
    | 'white'
    | 'blue'
    | 'peach'
    | 'mixed';

/** What falls from the sky over the flowers. */
export type FlowerRain = 'none' | 'petals' | 'photos' | 'both';

/** The frame the page video plays in. */
export type VideoFrame =
    | 'plain'
    | 'polaroid'
    | 'film'
    | 'tv'
    | 'hearts'
    | 'cinema'
    | 'phone';

/** The backdrop behind the page video. */
export type VideoBackground =
    | 'theme'
    | 'theater'
    | 'starry'
    | 'hearts'
    | 'sunset'
    | 'retro'
    | 'confetti';

export type ExperienceTemplateKey =
    | 'monthsary'
    | 'birthday'
    | 'love_story'
    | 'little_something'
    | 'digital_bouquet'
    | 'girlfriends_day'
    | 'valentines'
    | 'apology'
    | 'our_song'
    | 'anniversary'
    | 'wedding'
    | 'save_the_date'
    | 'bestie'
    | 'family'
    | 'graduation'
    | 'classic';

export type ExperienceTemplateOption = {
    value: ExperienceTemplateKey;
    label: string;
    description: string;
    theme: string;
};

export type ExperienceMoment = {
    date: string | null;
    title: string | null;
    caption: string | null;
    photo: number | null;
    photo_url: string | null;
};

export type ExperienceSectionType =
    | 'timeline'
    | 'film_strip'
    | 'scrapbook'
    | 'album'
    | 'note'
    | 'story_timeline'
    | 'polaroid_wall'
    | 'gallery'
    | 'letter'
    | 'quote'
    | 'song'
    | 'countdown'
    | 'video'
    | 'flowers';

/** An extra section the owner added between the template's own sections. */
export type ExperienceCustomSection = {
    id: string;
    type: ExperienceSectionType;
    /** How many template sections come before this one. */
    position: number;
    title: string | null;
    /** The note message, or the caption line of a film strip or scrapbook. */
    text: string | null;
    /** A hex color, or null to follow the page theme. */
    background: string | null;
    slots: {
        photo: number | null;
        photo_url: string | null;
        caption: string | null;
    }[];
};

/** Album art, preview and lyrics saved from the iTunes and LRCLIB APIs. */
export type SongDetails = {
    title: string;
    artist: string | null;
    artwork_url: string | null;
    preview_url: string | null;
    track_url: string | null;
    duration: number | null;
    synced_lyrics: { time: number; text: string }[];
    plain_lyrics: string[];
};

export type DigitalExperience = {
    code: string;
    template: ExperienceTemplateKey;
    theme: string;
    title: string;
    subtitle: string | null;
    recipient_name: string | null;
    sender_name: string | null;
    message: string | null;
    quote: string | null;
    flowers_note: string | null;
    flower_style: FlowerStyle;
    flower_rain: FlowerRain;
    /** Flowers bought at checkout for a design that does not include them. */
    flower_addon: boolean;
    photo_rain_layer: PhotoRainLayer;
    event_date: string | null;
    video_url: string | null;
    /** A short video file uploaded to the page (or kept in a demo draft). */
    video_file_url: string | null;
    video_frame: VideoFrame;
    video_background: VideoBackground;
    music_url: string | null;
    song_title: string | null;
    song_artist: string | null;
    song_ornament: 'none' | 'hearts';
    song_background: 'theme' | 'hearts';
    song_details: SongDetails | null;
    audio_url: string | null;
    photos: { index: number; url: string }[];
    /** Photos picked to rain over the flowers, apart from the page photos. */
    rain_photos: { index: number; url: string }[];
    moments: ExperienceMoment[];
    custom_sections: ExperienceCustomSection[];
    nfc_tag_uid: string | null;
    is_published: boolean;
    /** Owner/admin only: before this moment visitors see a countdown. */
    unlocks_at: string | null;
    /** Owner/admin only. */
    view_count: number | null;
    /** Owner/admin only. */
    heart_count: number | null;
    /** Owner/admin only: the page address, which opens nothing for anyone else. */
    public_url: string | null;
    qr_url: string | null;
    /** Admin only: the link to program into the NFC tag (with UID + counter mirror). */
    tag_url: string | null;
    /** Owner/admin only: the genuine tag has been tapped, so copies of it (and the QR code) are refused. */
    is_tag_check_active: boolean;
};

export type OrderReview = {
    rating: number;
    quote: string;
    author_name: string;
    is_published: boolean;
};

export type Personalization = {
    names?: string;
    date?: string;
    message?: string;
    song_title?: string;
    artist?: string;
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
    channel: 'website' | 'walk_in' | 'messenger' | 'other';
    channel_label: string;
    status: string;
    status_label: string;
    status_tone: StatusTone;
    stage: number;
    design_mode: 'self' | 'assisted';
    design_mode_label: string;
    product_name: string;
    product_slug?: string | null;
    product_art_style?: ArtStyle | null;
    product_max_photos?: number | null;
    category_name?: string | null;
    template_name: string | null;
    design_layout?: TemplateLayout | null;
    selected_options: SelectedOption[];
    personalization: Personalization;
    preview_approved_at: string | null;
    design_submitted_at: string | null;
    is_design_editable?: boolean;
    quantity: number;
    unit_price: number;
    subtotal: number;
    customization_fee: number;
    flowers_fee: number;
    delivery_fee: number;
    adjustment: number;
    adjustment_note: string | null;
    promo_code: string | null;
    discount: number;
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
    is_gift: boolean;
    gift_message: string | null;
    courier: string | null;
    tracking_number: string | null;
    tracking_url: string | null;
    is_reviewable: boolean;
    review?: OrderReview | null;
    payment_method?: PaymentMethod | null;
    files?: OrderFile[];
    proofs?: DesignProof[];
    activities?: OrderActivity[];
    payments?: Payment[];
    experience?: DigitalExperience | null;
    user?: { id: number; name: string; email: string } | null;
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

export type FinanceEntryTypeValue =
    'capital' | 'expense' | 'withdrawal' | 'income';

export type FinanceEntry = {
    id: number;
    type: FinanceEntryTypeValue;
    type_label: string;
    category: string | null;
    category_label: string | null;
    amount: number;
    description: string;
    occurred_on: string;
    notes: string | null;
    recorded_by?: string | null;
};

export type FinanceSummary = {
    overview: {
        capital: number;
        withdrawals: number;
        sales: number;
        other_income: number;
        expenses: number;
        net_profit: number;
        cash_on_hand: number;
        recovered_percent: number | null;
        left_to_recover: number;
    };
    period: {
        sales: number;
        other_income: number;
        income: number;
        expenses: number;
        net_profit: number;
        margin_percent: number | null;
    };
    trend: {
        month: string;
        income: number;
        expenses: number;
        net_profit: number;
    }[];
    expense_breakdown: { category: string; label: string; amount: number }[];
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
