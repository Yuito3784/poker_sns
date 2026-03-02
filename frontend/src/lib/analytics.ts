declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

export function gtagEvent(
  action: string,
  params?: Record<string, string | number | boolean>
) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", action, params);
}

// Custom event helpers
export const analytics = {
  signUp: () => gtagEvent("sign_up", { method: "email" }),

  login: (method: "email" | "google" | "line" | "x" | "magic_link") =>
    gtagEvent("login", { method }),

  postCreate: (hasPokerHand: boolean) =>
    gtagEvent("post_create", { poker_hand: hasPokerHand }),

  postLike: () => gtagEvent("post_like"),

  postRepost: () => gtagEvent("post_repost"),

  postBookmark: () => gtagEvent("post_bookmark"),

  affiliateClick: (partnerSlug: string) =>
    gtagEvent("affiliate_click", { partner_slug: partnerSlug }),

  subscriptionCheckout: () => gtagEvent("subscription_checkout"),

  subscriptionCancel: () => gtagEvent("subscription_cancel"),

  shareClick: (platform: "x" | "line" | "discord" | "copy" | "native") =>
    gtagEvent("share_click", { platform }),
};
