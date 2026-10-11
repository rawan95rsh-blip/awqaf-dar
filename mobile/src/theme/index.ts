import { I18nManager, Platform, type TextStyle, type ViewStyle } from "react-native";

/**
 * نظام التصميم — «سكينة»
 * هوية هادئة دافئة تناسب دور القرآن: أخضر زمردي عميق + ورق رملي + لمسة ذهبية.
 * كل الألوان والمسافات والخطوط تُستخدم من هنا فقط.
 */
export const palette = {
  emerald900: "#08392F",
  emerald800: "#0A4A3D",
  emerald700: "#0E5E4E",
  emerald600: "#14735F",
  emerald500: "#1E8A72",
  emerald100: "#D6EAE3",
  emerald50: "#EBF4F0",

  gold700: "#8A6420",
  gold600: "#B7862C",
  gold100: "#F4E7CC",
  gold50: "#FAF4E6",

  sand50: "#FBFAF7",
  sand100: "#F6F3EC",
  sand200: "#EFEAE0",
  sand300: "#E4DDD0",
  sand400: "#D3CABA",

  ink900: "#18211D",
  ink700: "#3C4842",
  ink500: "#5D6962",
  ink400: "#7F8A83",
  ink300: "#A7AFAA",

  white: "#FFFFFF",
} as const;

export const colors = {
  // الأساس
  primary: palette.emerald700,
  primaryPressed: palette.emerald800,
  primarySoft: palette.emerald50,
  primaryMuted: palette.emerald100,
  onPrimary: palette.white,

  accent: palette.gold600,
  accentStrong: palette.gold700,
  accentSoft: palette.gold50,
  accentMuted: palette.gold100,

  // الأسطح
  background: palette.sand100,
  surface: palette.white,
  surfaceSunken: palette.sand200,
  surfaceRaised: palette.white,
  overlay: "rgba(13, 22, 18, 0.45)",

  // الحدود
  border: palette.sand300,
  borderStrong: palette.sand400,
  divider: palette.sand200,

  // النصوص
  text: palette.ink900,
  textSecondary: palette.ink500,
  textMuted: palette.ink400,
  textDisabled: palette.ink300,

  // الحالات
  success: "#1F7A4D",
  successSoft: "#E3F2E9",
  warning: "#8F6200",
  warningSoft: "#FBF0D5",
  danger: "#B42318",
  dangerSoft: "#FCE9E7",
  info: "#1D5C8C",
  infoSoft: "#E4EEF7",

  focus: palette.emerald500,
} as const;

export type ColorName = keyof typeof colors;

export type Tone = "neutral" | "primary" | "accent" | "success" | "warning" | "danger" | "info";

export const toneColors: Record<Tone, { fg: string; bg: string; border: string }> = {
  neutral: { fg: colors.textSecondary, bg: colors.surfaceSunken, border: colors.border },
  primary: { fg: colors.primary, bg: colors.primarySoft, border: colors.primaryMuted },
  accent: { fg: colors.accentStrong, bg: colors.accentSoft, border: colors.accentMuted },
  success: { fg: colors.success, bg: colors.successSoft, border: "#C6E5D2" },
  warning: { fg: colors.warning, bg: colors.warningSoft, border: "#F0DDAA" },
  danger: { fg: colors.danger, bg: colors.dangerSoft, border: "#F5C9C4" },
  info: { fg: colors.info, bg: colors.infoSoft, border: "#C7DBEC" },
};

/** شبكة 4pt */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

/** خط IBM Plex Sans Arabic — لكل وزن ملف مستقل */
export const fonts = {
  regular: "IBMPlexSansArabic_400Regular",
  medium: "IBMPlexSansArabic_500Medium",
  semibold: "IBMPlexSansArabic_600SemiBold",
  bold: "IBMPlexSansArabic_700Bold",
} as const;

export type FontWeightName = keyof typeof fonts;

/**
 * سلم الخطوط — لا letterSpacing للعربية (يكسر اتصال الحروف).
 */
export const typography = {
  display: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 40 },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 34 },
  headline: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 28 },
  bodyLarge: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 28 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 24 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 22 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  micro: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 18 },
  number: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 34, fontVariant: ["tabular-nums"] },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

const shadowColor = "#1B2A23";

export const shadows = {
  none: {},
  sm: Platform.select<ViewStyle>({
    ios: { shadowColor, shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    android: { elevation: 1 },
    default: { shadowColor, shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  }) as ViewStyle,
  md: Platform.select<ViewStyle>({
    ios: { shadowColor, shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
    android: { elevation: 3 },
    default: { shadowColor, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  }) as ViewStyle,
  lg: Platform.select<ViewStyle>({
    ios: { shadowColor, shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
    android: { elevation: 8 },
    default: { shadowColor, shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  }) as ViewStyle,
} as const;

export const layout = {
  screenPadding: space[5],
  maxContentWidth: 640,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
  minTouch: 44,
} as const;

export const motion = {
  fast: 120,
  base: 200,
  slow: 320,
  pressScale: 0.98,
} as const;

/** الأيقونة الاتجاهية الصحيحة في الواجهة العربية */
export function forwardIcon(): "chevron-left" | "chevron-right" {
  return I18nManager.isRTL || Platform.OS === "web" ? "chevron-left" : "chevron-right";
}

export function backIcon(): "arrow-right" | "arrow-left" {
  return I18nManager.isRTL || Platform.OS === "web" ? "arrow-right" : "arrow-left";
}

export const theme = { colors, palette, space, radius, fonts, typography, shadows, layout, motion, toneColors };
export type Theme = typeof theme;
