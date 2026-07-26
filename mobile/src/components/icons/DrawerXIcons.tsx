import React from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { centerColors } from "@/constants";

/** مقاس أيقونات شريط X الجانبي */
export const DRAWER_ICON_SIZE = 26.25;

const VB = 24;
const STROKE = 2.25;

function strokeProps(color: string) {
  return {
    stroke: color,
    strokeWidth: STROKE,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

type IconBaseProps = {
  color?: string;
  size?: number;
};

function IconWrap({
  children,
  color = centerColors.text,
  size = DRAWER_ICON_SIZE,
}: IconBaseProps & { children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`} fill="none">
      {children}
    </Svg>
  );
}

/** الرئيسية — ممتلئة (نشط) كما في X */
export function HomeFilledIcon({
  color = centerColors.text,
  size = DRAWER_ICON_SIZE,
}: IconBaseProps) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`} fill="none">
      <Path
        fill={color}
        d="M21.591 7.146v-.067a1.5 1.5 0 00-.909-1.235L12.611 1.18a1.5 1.5 0 00-1.542 0L2.408 7.078A1.5 1.5 0 001.5 8.312v11.938A1.75 1.75 0 003.25 22h6.5a.75.75 0 00.75-.75v-6.25a2.25 2.25 0 114.5 0v6.25a.75.75 0 00.75.75h6.5a1.75 1.75 0 001.75-1.75V8.312a1.5 1.5 0 00-.909-1.234z"
      />
    </Svg>
  );
}

/** الرئيسية — خطية (غير نشط) */
export function HomeOutlineIcon({
  color = centerColors.text,
  size = DRAWER_ICON_SIZE,
}: IconBaseProps) {
  return (
    <IconWrap color={color} size={size}>
      <Path
        d="M12 2.59l8.008 5.54a1.5 1.5 0 01.592 1.2V20.25a1.75 1.75 0 01-1.75 1.75h-4.5a.75.75 0 01-.75-.75V15a2.25 2.25 0 00-4.5 0v6.25a.75.75 0 01-.75.75H4.75A1.75 1.75 0 013 20.25V9.33a1.5 1.5 0 01.592-1.2L12 2.59z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconWrap>
  );
}

/** الفصول — قائمة (مستطيل مستدير + خطان) */
export function ClassesIcon({
  color = centerColors.text,
  size = DRAWER_ICON_SIZE,
}: IconBaseProps) {
  const s = strokeProps(color);
  return (
    <IconWrap color={color} size={size}>
      <Path
        d="M7.5 4h9a2.5 2.5 0 012.5 2.5v11a2.5 2.5 0 01-2.5 2.5h-9A2.5 2.5 0 015 17.5v-11A2.5 2.5 0 017.5 4z"
        fill="none"
        {...s}
      />
      <Path d="M9 10.25h6" fill="none" {...s} />
      <Path d="M9 13.75h6" fill="none" {...s} />
    </IconWrap>
  );
}

/** طلبات التسجيل — صندوق وارد بأسلوب X */
export function RequestsIcon({
  color = centerColors.text,
  size = DRAWER_ICON_SIZE,
}: IconBaseProps) {
  return (
    <IconWrap color={color} size={size}>
      <Path
        d="M3 6.75h18M5.25 6.75V18a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25V6.75"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 12.75l3 3 3-3"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </IconWrap>
  );
}

/** الطلاب — شخصان متداخلان (أسلوب X: دائرة + قوس كتفين بفجوة) */
export function StudentsIcon({
  color = centerColors.text,
  size = DRAWER_ICON_SIZE,
}: IconBaseProps) {
  const s = strokeProps(color);
  const headR = 2.625;
  const headCy = 7.375;
  const leftCx = 8.625;
  const rightCx = 15.375;
  const shoulderR = 3.625;
  const shoulderBaseY = 19.125;

  return (
    <IconWrap color={color} size={size}>
      {/* الخلفي — الشخص الأيسر (يُرسم أولاً) */}
      <Circle cx={leftCx} cy={headCy} r={headR} fill="none" {...s} />
      <Path
        d={`M${leftCx - shoulderR} ${shoulderBaseY} A${shoulderR} ${shoulderR} 0 0 1 11.4 17.83`}
        fill="none"
        {...s}
      />
      {/* الأمامي — الشخص الأيمن (يغطي التداخل مع فجوة بين الخطين) */}
      <Circle cx={rightCx} cy={headCy} r={headR} fill="none" {...s} />
      <Path
        d={`M11.75 ${shoulderBaseY} A${shoulderR} ${shoulderR} 0 0 1 ${rightCx + shoulderR} ${shoulderBaseY}`}
        fill="none"
        {...s}
      />
    </IconWrap>
  );
}

/** التقارير — مخطط خطي بأسلوب X */
export function ReportsIcon({
  color = centerColors.text,
  size = DRAWER_ICON_SIZE,
}: IconBaseProps) {
  return (
    <IconWrap color={color} size={size}>
      <Path
        d="M4 18.25l4.5-5.25 4 3.25L18.5 7.75"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 19.75h16"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </IconWrap>
  );
}

/** الإعدادات — عجلة بثمانية أسنان مستديرة */
export function SettingsIcon({
  color = centerColors.text,
  size = DRAWER_ICON_SIZE,
}: IconBaseProps) {
  const s = strokeProps(color);
  return (
    <IconWrap color={color} size={size}>
      <Path
        d="M12 4.25c.48 0 .92.26 1.15.68l.52 1.02 1.13-.22c.48-.09.97.15 1.16.6l.45 1.08 1.05.59c.42.24.61.74.46 1.18l-.28.9.72.78c.36.39.34 1-.05 1.36l-.78.72.28.9c.15.44-.04.94-.46 1.18l-1.05.59-.45 1.08c-.19.45-.68.69-1.16.6l-1.13-.22-.52 1.02a1.25 1.25 0 01-1.15.68c-.48 0-.92-.26-1.15-.68l-.52-1.02-1.13.22c-.48.09-.97-.15-1.16-.6l-.45-1.08-1.05-.59c-.42-.24-.61-.74-.46-1.18l.28-.9-.72-.78c-.36-.39-.34-1-.05-1.36l.78-.72-.28-.9c-.15-.44.04-.94.46-1.18l1.05-.59.45-1.08c.19-.45.68-.69 1.16-.6l1.13.22.52-1.02c.23-.42.67-.68 1.15-.68z"
        fill="none"
        {...s}
      />
      <Circle cx="12" cy="12" r="2.5" fill="none" {...s} />
    </IconWrap>
  );
}

/** الحساب — شخص واحد */
export function AccountIcon({
  color = centerColors.text,
  size = DRAWER_ICON_SIZE,
}: IconBaseProps) {
  const s = strokeProps(color);
  return (
    <IconWrap color={color} size={size}>
      <Circle cx="12" cy="7.75" r="3" fill="none" {...s} />
      <Path
        d="M6.25 19.5c0-3.18 2.57-5.75 5.75-5.75s5.75 2.57 5.75 5.75"
        fill="none"
        {...s}
      />
    </IconWrap>
  );
}

/** شعار المركز — مسجد متناسق ومتمركز */
export function CenterBrandIcon({
  color = centerColors.text,
  size = DRAWER_ICON_SIZE,
}: IconBaseProps) {
  const s = strokeProps(color);
  return (
    <IconWrap color={color} size={size}>
      {/* قبة متمركزة */}
      <Path
        d="M7 11.5c0-2.76 2.24-5 5-5s5 2.24 5 5"
        fill="none"
        {...s}
      />
      {/* هلال صغير على القبة */}
      <Path
        d="M14.1 7.85a1.3 1.3 0 11-1.55 0"
        fill="none"
        {...s}
      />
      {/* جسم المبنى */}
      <Path
        d="M6.5 11.5h11v8a1 1 0 01-1 1h-9a1 1 0 01-1-1v-8z"
        fill="none"
        {...s}
      />
      {/* باب مقوس في المنتصف */}
      <Path
        d="M10.75 17v-2.5a1.25 1.25 0 012.5 0V17"
        fill="none"
        {...s}
      />
      {/* مئذنة عمودية مستقيمة */}
      <Path d="M17.25 6.5v8.5" fill="none" {...s} />
      <Path d="M16.25 6.5h2" fill="none" {...s} />
    </IconWrap>
  );
}

export type DrawerIconType =
  | "home"
  | "classes"
  | "requests"
  | "students"
  | "reports"
  | "settings"
  | "account";

export function DrawerXIcon({
  type,
  active = false,
  color = centerColors.text,
  size = DRAWER_ICON_SIZE,
}: {
  type: DrawerIconType;
  active?: boolean;
  color?: string;
  size?: number;
}) {
  if (type === "home") {
    return active ? (
      <HomeFilledIcon color={color} size={size} />
    ) : (
      <HomeOutlineIcon color={color} size={size} />
    );
  }

  const icons: Record<Exclude<DrawerIconType, "home">, React.ReactNode> = {
    classes: <ClassesIcon color={color} size={size} />,
    requests: <RequestsIcon color={color} size={size} />,
    students: <StudentsIcon color={color} size={size} />,
    reports: <ReportsIcon color={color} size={size} />,
    settings: <SettingsIcon color={color} size={size} />,
    account: <AccountIcon color={color} size={size} />,
  };

  return icons[type];
}
