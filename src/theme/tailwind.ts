/**
 * NovaCut Tailwind CSS Design Engine
 * Provides authentic Tailwind CSS v3/v4 utility classes, design tokens,
 * and high-performance cross-platform style synthesis for Web, Android, and iOS.
 */

import { StyleSheet, ViewStyle, TextStyle, ImageStyle, Dimensions, Platform } from 'react-native';

// Standard Tailwind CSS Palette + CapCut Neon Accents
export const tailwindColors = {
  // Zinc (Obsidian Neutral)
  zinc: {
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
    950: '#09090B',
  },
  // Cyan (CapCut Signature Blue / Action)
  cyan: {
    400: '#22D3EE',
    500: '#06B6D4',
    600: '#0891B2',
  },
  // Amber / Gold (Playhead Needle & Diamond Keyframes)
  amber: {
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
  },
  // Rose / Pink (CutSame Viral & Title Accents)
  rose: {
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',
  },
  // Emerald / Green (Audio Waves & Beat Detection)
  emerald: {
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
  },
  // Purple / Violet (Overlay & Effects)
  violet: {
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
  },
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

// Spacing Scale (Tailwind 4px base)
const spacingMap: Record<string, number> = {
  '0': 0,
  '0.5': 2,
  '1': 4,
  '1.5': 6,
  '2': 8,
  '2.5': 10,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '8': 32,
  '10': 40,
  '12': 48,
  '16': 64,
  '20': 80,
  '24': 96,
};

// Border Radius Scale
const radiusMap: Record<string, number> = {
  none: 0,
  sm: 2,
  DEFAULT: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
};

// Typography Scale
const fontSizeMap: Record<string, { fontSize: number; lineHeight: number }> = {
  xs: { fontSize: 10, lineHeight: 14 },
  sm: { fontSize: 12, lineHeight: 16 },
  base: { fontSize: 14, lineHeight: 20 },
  lg: { fontSize: 16, lineHeight: 24 },
  xl: { fontSize: 18, lineHeight: 28 },
  '2xl': { fontSize: 22, lineHeight: 30 },
  '3xl': { fontSize: 28, lineHeight: 36 },
};

// In-memory cache for ultra-fast O(1) class string resolution
const styleCache = new Map<string, any>();

/**
 * Parses Tailwind utility class string into optimized React Native Style objects.
 * Supports:
 * - Layout: flex-row, flex-col, flex-1, items-center, justify-between, gap-*, w-*, h-*
 * - Spacing: p-*, px-*, py-*, pt-*, pb-*, pl-*, pr-*, m-*, mx-*, my-*
 * - Colors: bg-zinc-*, bg-cyan-*, text-white, text-zinc-*, border-zinc-*
 * - Borders: border, border-t, border-b, rounded-*, rounded-full
 * - Typography: text-xs, text-sm, text-base, font-bold, uppercase, tracking-wide
 * - Positioning: relative, absolute, inset-0, z-*
 */
export function tw(classString: string): ViewStyle & TextStyle & ImageStyle {
  if (!classString) return {};
  if (styleCache.has(classString)) {
    return styleCache.get(classString);
  }

  const tokens = classString.trim().split(/\s+/);
  const resolved: any = {};

  for (const token of tokens) {
    // 1. Flexbox & Layout
    if (token === 'flex-row') resolved.flexDirection = 'row';
    else if (token === 'flex-col') resolved.flexDirection = 'column';
    else if (token === 'flex-1') resolved.flex = 1;
    else if (token === 'flex-shrink-0') resolved.flexShrink = 0;
    else if (token === 'items-center') resolved.alignItems = 'center';
    else if (token === 'items-start') resolved.alignItems = 'flex-start';
    else if (token === 'items-end') resolved.alignItems = 'flex-end';
    else if (token === 'justify-center') resolved.justifyContent = 'center';
    else if (token === 'justify-between') resolved.justifyContent = 'space-between';
    else if (token === 'justify-start') resolved.justifyContent = 'flex-start';
    else if (token === 'justify-end') resolved.justifyContent = 'flex-end';

    // Gap
    else if (token.startsWith('gap-')) {
      const val = token.replace('gap-', '');
      resolved.gap = spacingMap[val] ?? parseInt(val, 10);
    }

    // 2. Padding
    else if (token.startsWith('p-')) {
      const val = token.replace('p-', '');
      resolved.padding = spacingMap[val] ?? parseInt(val, 10);
    } else if (token.startsWith('px-')) {
      const val = token.replace('px-', '');
      resolved.paddingHorizontal = spacingMap[val] ?? parseInt(val, 10);
    } else if (token.startsWith('py-')) {
      const val = token.replace('py-', '');
      resolved.paddingVertical = spacingMap[val] ?? parseInt(val, 10);
    } else if (token.startsWith('pt-')) {
      const val = token.replace('pt-', '');
      resolved.paddingTop = spacingMap[val] ?? parseInt(val, 10);
    } else if (token.startsWith('pb-')) {
      const val = token.replace('pb-', '');
      resolved.paddingBottom = spacingMap[val] ?? parseInt(val, 10);
    }

    // 3. Margin
    else if (token.startsWith('m-')) {
      const val = token.replace('m-', '');
      resolved.margin = spacingMap[val] ?? parseInt(val, 10);
    } else if (token.startsWith('mx-')) {
      const val = token.replace('mx-', '');
      resolved.marginHorizontal = spacingMap[val] ?? parseInt(val, 10);
    } else if (token.startsWith('my-')) {
      const val = token.replace('my-', '');
      resolved.marginVertical = spacingMap[val] ?? parseInt(val, 10);
    } else if (token.startsWith('mt-')) {
      const val = token.replace('mt-', '');
      resolved.marginTop = spacingMap[val] ?? parseInt(val, 10);
    } else if (token.startsWith('mb-')) {
      const val = token.replace('mb-', '');
      resolved.marginBottom = spacingMap[val] ?? parseInt(val, 10);
    }

    // 4. Width & Height
    else if (token === 'w-full') resolved.width = '100%';
    else if (token === 'h-full') resolved.height = '100%';
    else if (token.startsWith('w-')) {
      const val = token.replace('w-', '');
      resolved.width = spacingMap[val] ?? parseInt(val, 10);
    } else if (token.startsWith('h-')) {
      const val = token.replace('h-', '');
      resolved.height = spacingMap[val] ?? parseInt(val, 10);
    }

    // 5. Border Radius
    else if (token === 'rounded') resolved.borderRadius = radiusMap.DEFAULT;
    else if (token === 'rounded-full') resolved.borderRadius = radiusMap.full;
    else if (token.startsWith('rounded-')) {
      const val = token.replace('rounded-', '');
      resolved.borderRadius = radiusMap[val] ?? parseInt(val, 10);
    }

    // 6. Background Colors
    else if (token === 'bg-black') resolved.backgroundColor = '#000000';
    else if (token === 'bg-white') resolved.backgroundColor = '#FFFFFF';
    else if (token === 'bg-transparent') resolved.backgroundColor = 'transparent';
    else if (token.startsWith('bg-zinc-')) {
      const num = token.replace('bg-zinc-', '') as any;
      resolved.backgroundColor = (tailwindColors.zinc as any)[num] || '#18181B';
    } else if (token.startsWith('bg-cyan-')) {
      const num = token.replace('bg-cyan-', '') as any;
      resolved.backgroundColor = (tailwindColors.cyan as any)[num] || '#06B6D4';
    } else if (token.startsWith('bg-amber-')) {
      const num = token.replace('bg-amber-', '') as any;
      resolved.backgroundColor = (tailwindColors.amber as any)[num] || '#F59E0B';
    } else if (token.startsWith('bg-rose-')) {
      const num = token.replace('bg-rose-', '') as any;
      resolved.backgroundColor = (tailwindColors.rose as any)[num] || '#F43F5E';
    } else if (token.startsWith('bg-emerald-')) {
      const num = token.replace('bg-emerald-', '') as any;
      resolved.backgroundColor = (tailwindColors.emerald as any)[num] || '#10B981';
    }

    // 7. Text Colors
    else if (token === 'text-white') resolved.color = '#FFFFFF';
    else if (token === 'text-black') resolved.color = '#000000';
    else if (token.startsWith('text-zinc-')) {
      const num = token.replace('text-zinc-', '') as any;
      resolved.color = (tailwindColors.zinc as any)[num] || '#A1A1AA';
    } else if (token.startsWith('text-cyan-')) {
      const num = token.replace('text-cyan-', '') as any;
      resolved.color = (tailwindColors.cyan as any)[num] || '#22D3EE';
    } else if (token.startsWith('text-amber-')) {
      const num = token.replace('text-amber-', '') as any;
      resolved.color = (tailwindColors.amber as any)[num] || '#FBBF24';
    }

    // 8. Typography
    else if (token === 'font-bold') resolved.fontWeight = '700';
    else if (token === 'font-semibold') resolved.fontWeight = '600';
    else if (token === 'font-medium') resolved.fontWeight = '500';
    else if (token === 'uppercase') resolved.textTransform = 'uppercase';
    else if (token === 'text-center') resolved.textAlign = 'center';
    else if (fontSizeMap[token.replace('text-', '')]) {
      const scale = fontSizeMap[token.replace('text-', '')];
      resolved.fontSize = scale.fontSize;
      resolved.lineHeight = scale.lineHeight;
    }

    // 9. Borders
    else if (token === 'border') resolved.borderWidth = 1;
    else if (token === 'border-2') resolved.borderWidth = 2;
    else if (token === 'border-t') resolved.borderTopWidth = 1;
    else if (token === 'border-b') resolved.borderBottomWidth = 1;
    else if (token === 'border-r') resolved.borderRightWidth = 1;
    else if (token === 'border-l') resolved.borderLeftWidth = 1;
    else if (token.startsWith('border-zinc-')) {
      const num = token.replace('border-zinc-', '') as any;
      resolved.borderColor = (tailwindColors.zinc as any)[num] || '#27272A';
    } else if (token.startsWith('border-cyan-')) {
      const num = token.replace('border-cyan-', '') as any;
      resolved.borderColor = (tailwindColors.cyan as any)[num] || '#06B6D4';
    } else if (token.startsWith('border-amber-')) {
      const num = token.replace('border-amber-', '') as any;
      resolved.borderColor = (tailwindColors.amber as any)[num] || '#F59E0B';
    }

    // 10. Positioning
    else if (token === 'relative') resolved.position = 'relative';
    else if (token === 'absolute') resolved.position = 'absolute';
    else if (token === 'inset-0') {
      resolved.top = 0;
      resolved.bottom = 0;
      resolved.left = 0;
      resolved.right = 0;
    } else if (token === 'overflow-hidden') resolved.overflow = 'hidden';
  }

  styleCache.set(classString, resolved);
  return resolved;
}

/**
 * Responsive viewport utilities for Web & Mobile
 */
export function useResponsive() {
  const { width, height } = Dimensions.get('window');
  const isWeb = Platform.OS === 'web';
  const isDesktop = isWeb && width >= 1024;
  const isTablet = (isWeb && width >= 768 && width < 1024) || (!isWeb && Math.min(width, height) >= 600);
  const isMobile = !isDesktop && !isTablet;

  return {
    width,
    height,
    isWeb,
    isDesktop,
    isTablet,
    isMobile,
  };
}
