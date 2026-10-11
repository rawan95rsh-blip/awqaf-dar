import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/** صفحة الويب: عربية من اليمين لليسار */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#0E5E4E" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: "body{background-color:#F6F3EC;}" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
