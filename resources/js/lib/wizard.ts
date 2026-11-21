export type DesignMode = 'self' | 'assisted';

export const WIZARD_STEPS = [
    { key: 'category', title: 'Occasion', description: 'Who is it for?' },
    { key: 'product', title: 'Gift', description: 'Choose your keepsake' },
    { key: 'template', title: 'Template', description: 'Pick a design' },
    { key: 'customize', title: 'Personalize', description: 'Add your story' },
    { key: 'specs', title: 'Details', description: 'Size & finish' },
    { key: 'preview', title: 'Preview', description: 'Review & approve' },
    { key: 'checkout', title: 'Checkout', description: 'Delivery & payment' },
] as const;

export type WizardStepKey = (typeof WIZARD_STEPS)[number]['key'];
