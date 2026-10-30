/** GET a URL and parse the JSON, giving up after 20 seconds. */
export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'job-radar (personal job search)' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} from ${new URL(url).host}`);
  }
  return (await response.json()) as T;
}

/** "<p>Hi &amp; welcome</p>" -> "Hi & welcome". Good enough for keyword matching. */
export function htmlToText(html: string): string {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export const looksRemote = (...texts: string[]) => texts.some((text) => /\bremote\b/i.test(text));
