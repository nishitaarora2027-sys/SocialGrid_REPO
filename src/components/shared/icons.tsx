import {
  CakeIcon,
  CalendarHeartIcon,
  ChefHatIcon,
  ClapperboardIcon,
  CoffeeIcon,
  FlameIcon,
  GiftIcon,
  HeartIcon,
  ImageIcon,
  MegaphoneIcon,
  PartyPopperIcon,
  ScissorsIcon,
  SparklesIcon,
  StarIcon,
  TagIcon,
  UtensilsIcon,
  type LucideIcon,
} from "lucide-react";

/** Icons selectable for quick-start cards (stored by name in the database) */
export const CARD_ICONS: Record<string, LucideIcon> = {
  "chef-hat": ChefHatIcon,
  tag: TagIcon,
  "party-popper": PartyPopperIcon,
  utensils: UtensilsIcon,
  star: StarIcon,
  clapperboard: ClapperboardIcon,
  sparkles: SparklesIcon,
  scissors: ScissorsIcon,
  gift: GiftIcon,
  heart: HeartIcon,
  coffee: CoffeeIcon,
  cake: CakeIcon,
  flame: FlameIcon,
  megaphone: MegaphoneIcon,
  image: ImageIcon,
  "calendar-heart": CalendarHeartIcon,
};

export function CardIcon({ name, className }: { name: string; className?: string }) {
  const Icon = CARD_ICONS[name] ?? SparklesIcon;
  return <Icon className={className} />;
}
