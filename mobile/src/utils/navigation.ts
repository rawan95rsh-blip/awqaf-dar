import type { Href, Router } from "expo-router";

export function goBack(router: Router, fallback: Href): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
