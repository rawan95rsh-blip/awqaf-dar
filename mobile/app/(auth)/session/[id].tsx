import { Redirect, useLocalSearchParams, type Href } from "expo-router";

/**
 * المسار القديم لتفاصيل الحصة — يحوّل إلى /student/session/[id]
 * حتى تبقى روابط الإشعارات السابقة صالحة.
 */
export default function LegacySessionRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={(id ? `/student/session/${id}` : "/student/schedule") as Href} />;
}
