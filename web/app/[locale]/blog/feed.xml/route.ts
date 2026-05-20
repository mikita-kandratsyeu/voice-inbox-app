import { buildBlogRssXml } from '@/lib/blog-feed';

type RouteContext = { params: Promise<{ locale: string }> };

export const revalidate = 300;

export async function GET(_request: Request, { params }: RouteContext): Promise<Response> {
  const { locale } = await params;
  const xml = await buildBlogRssXml(locale);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
