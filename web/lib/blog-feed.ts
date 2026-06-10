import { BASE_URL_OR_FALLBACK } from '@/config/constants';
import { listPublishedReleases } from '@/lib/releases';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripMarkdownForDescription(md: string, maxLen = 400): string {
  const plain = md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen - 1)}…`;
}

export async function buildBlogRssXml(locale: string): Promise<string> {
  const loc = locale === 'ru' ? 'ru' : 'en';
  const prefix = `/${loc}`;
  const channelUrl = `${BASE_URL_OR_FALLBACK}${prefix}/blog`;
  const posts = await listPublishedReleases(loc);
  const channelTitle = loc === 'ru' ? 'Voice Inbox AI — блог' : 'Voice Inbox AI — Blog';
  const channelDescription =
    loc === 'ru'
      ? 'Обновления и заметки о релизах Voice Inbox AI.'
      : 'Release notes and product updates for Voice Inbox AI.';

  const items = posts
    .map((p) => {
      const link = `${BASE_URL_OR_FALLBACK}${prefix}/blog/${p.slug}`;
      const pubDate = (p.publishedAt ?? p.createdAt).toUTCString();
      const description = escapeXml(p.summary?.trim() || stripMarkdownForDescription(''));
      const title = escapeXml(p.title);
      return `    <item>
      <title>${title}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description || title}</description>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(channelUrl)}</link>
    <description>${escapeXml(channelDescription)}</description>
    <language>${loc === 'ru' ? 'ru' : 'en'}</language>
    <atom:link href="${escapeXml(`${channelUrl}/feed.xml`)}" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;
}
