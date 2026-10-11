import { Redirect, type Href } from "expo-router";

/**
 * المسار القديم لواجهة الطالبة — أصبحت في /student (تبويبات).
 * نُبقيه تحويلاً حتى تعمل الروابط والإشعارات القديمة.
 */
export default function LegacyStudentHomeRedirect() {
  return <Redirect href={"/student" as Href} />;
}
