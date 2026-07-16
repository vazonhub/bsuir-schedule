import { Ionicons } from '@expo/vector-icons';

import { usePalette } from '@hooks/usePalette';
import { getFlameColor } from '@utils/fire';

interface Props {
  /** Текущая длина серии — определяет цвет и залитость пламени. */
  current: number;
  size?: number;
  /** Переопределить цвет (для celebration-анимаций в Фазе 4). */
  color?: string;
}

/**
 * Иконка пламени огонька. При серии 0 — контурное «холодное» пламя,
 * иначе залитое, с цветом по тиру (`getFlameColor`).
 */
export const FlameIcon = ({ current, size = 14, color }: Props) => {
  const Palette = usePalette();
  const hot = current > 0;
  const resolved = color ?? (hot ? getFlameColor(current) : Palette.textTertiary);
  return <Ionicons name={hot ? 'flame' : 'flame-outline'} size={size} color={resolved} />;
};
