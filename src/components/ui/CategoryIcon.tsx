import {
  Briefcase, Laptop, Store, TrendingUp, Gift, PlusCircle,
  Utensils, Car, ShoppingBag, Tv, Home, Zap, Heart, GraduationCap,
  Plane, RefreshCw, Shield, MinusCircle, Tag, Wallet, CreditCard,
  Building2, BarChart3, Target, Repeat, Circle
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  briefcase: Briefcase,
  laptop: Laptop,
  store: Store,
  'trending-up': TrendingUp,
  gift: Gift,
  'plus-circle': PlusCircle,
  utensils: Utensils,
  car: Car,
  'shopping-bag': ShoppingBag,
  tv: Tv,
  home: Home,
  zap: Zap,
  heart: Heart,
  'graduation-cap': GraduationCap,
  plane: Plane,
  'refresh-cw': RefreshCw,
  shield: Shield,
  'minus-circle': MinusCircle,
  tag: Tag,
  wallet: Wallet,
  'credit-card': CreditCard,
  bank: Building2,
  investment: BarChart3,
  target: Target,
  repeat: Repeat,
};

interface CategoryIconProps {
  icon: string;
  size?: number;
  className?: string;
}

export function CategoryIcon({ icon, size = 16, className }: CategoryIconProps) {
  const Icon = ICON_MAP[icon] ?? Circle;
  return <Icon size={size} className={className} />;
}
