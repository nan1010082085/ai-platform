/**
 * 构建对话分享页绝对 URL，与 Vue Router base / Vite base 对齐。
 */
export function buildSharedConversationUrl(shareId: string, origin = window.location.origin): string {
  const raw =
    (import.meta.env.VITE_ROUTE_BASE as string | undefined) ||
    (import.meta.env.BASE_URL as string | undefined) ||
    '/'
  const base = raw === '/' ? '' : raw.replace(/\/$/, '')
  return `${origin}${base}/shared/${encodeURIComponent(shareId)}`
}
