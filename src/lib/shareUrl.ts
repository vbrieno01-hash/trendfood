const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

/**
 * Returns the shareable URL for a store that includes dynamic OG meta tags.
 * When shared on WhatsApp / social media, this URL shows the store's logo and name.
 * When opened by a user, it instantly redirects to the real store page.
 */
export function getShareableStoreUrl(slug: string): string {
  return `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/og-share/${slug}`;
}
