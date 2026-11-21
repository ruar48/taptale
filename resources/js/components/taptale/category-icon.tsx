import {
    Apple,
    Baby,
    Cake,
    CalendarHeart,
    Gem,
    Gift,
    GraduationCap,
    Heart,
    Home,
    Sparkles,
    Users,
} from 'lucide-react';
import type { LucideIcon, LucideProps } from 'lucide-react';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
    heart: Heart,
    gem: Gem,
    baby: Baby,
    cake: Cake,
    'calendar-heart': CalendarHeart,
    'graduation-cap': GraduationCap,
    apple: Apple,
    users: Users,
    home: Home,
    sparkles: Sparkles,
    gift: Gift,
};

export function CategoryIcon({
    name,
    ...props
}: { name: string } & LucideProps) {
    const Icon = CATEGORY_ICONS[name] ?? Gift;

    return <Icon {...props} />;
}
