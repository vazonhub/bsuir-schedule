/**
 * Native deep-link interception (Expo Router).
 *
 * `redirectSystemPath` runs *before* Expo Router resolves an incoming URL —
 * including the cold-start launch URL — so it is the reliable place to rewrite
 * links that don't map 1:1 to a route file. Doing it in a `useEffect` (as the
 * root layout also does) loses a race on cold start and briefly renders the
 * built-in "Unmatched Route" / sitemap screen.
 *
 * Lock Screen (accessory) widgets open `bsuirtime://lesson?id=<blockId>`. There
 * is no `lesson` route, so without this redirect Expo Router falls through to
 * the sitemap. We send every such tap to the "My" tab; the lesson id itself is
 * read from the raw launch URL in `app/_layout.tsx` and auto-opens the details
 * sheet once the schedule mounts. Anything else is passed through untouched so
 * OAuth / dev-client links keep working.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    // `path` may arrive as a full URL (`bsuirtime://lesson?id=...`) or already
    // scheme-stripped (`/lesson?id=...` | `lesson?id=...`). Extract the first
    // meaningful segment either way.
    const withoutScheme = path.replace(/^[a-zA-Z][\w+.-]*:\/\//, '');
    const firstSegment = withoutScheme.replace(/^\/+/, '').split(/[/?#]/)[0];
    if (firstSegment === 'lesson') {
      return '/(tabs)/(amy)';
    }
  } catch {
    // Malformed path — fall through to the default resolution below.
  }
  return path;
}
