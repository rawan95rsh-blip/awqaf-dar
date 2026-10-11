import { forwardRef } from "react";
import { Text as RNText, StyleSheet, type TextProps as RNTextProps, type TextStyle } from "react-native";
import { colors, fonts, typography, type ColorName, type FontWeightName, type TypographyVariant } from "@/src/theme";

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  color?: ColorName | (string & {});
  weight?: FontWeightName;
  align?: "auto" | "center";
  /** أرقام بعرض ثابت للجداول والإحصاءات */
  tabular?: boolean;
};

/**
 * نص التطبيق — يفرض خط IBM Plex Sans Arabic وسلم الأحجام.
 * المحاذاة الافتراضية «طبيعية» فتتبع اتجاه العربية (يمين).
 */
const Text = forwardRef<RNText, TextProps>(function Text(
  { variant = "body", color = "text", weight, align, tabular, style, ...rest },
  ref
) {
  const resolvedColor = color in colors ? colors[color as ColorName] : color;
  const extra: TextStyle = {};
  if (weight) extra.fontFamily = fonts[weight];
  if (align === "center") extra.textAlign = "center";
  if (tabular) extra.fontVariant = ["tabular-nums"];

  return (
    <RNText
      ref={ref}
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[styles.base, typography[variant], { color: resolvedColor }, extra, style]}
    />
  );
});

const styles = StyleSheet.create({
  base: {
    writingDirection: "rtl",
  },
});

export default Text;
