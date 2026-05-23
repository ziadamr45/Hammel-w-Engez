/**
 * Video Extractor Service - Port 3031
 * Uses z-ai CLI for page reading (more reliable than SDK in Bun)
 */

const PORT = 3031;

const PLATFORM_MAP: Record<string, { name: string; nameAr: string; patterns: RegExp[] }> = {
  youtube: { name: 'YouTube', nameAr: 'يوتيوب', patterns: [/youtube\.com/, /youtu\.be/] },
  tiktok: { name: 'TikTok', nameAr: 'تيك توك', patterns: [/tiktok\.com/, /vm\.tiktok\.com/] },
  facebook: { name: 'Facebook', nameAr: 'فيسبوك', patterns: [/facebook\.com/, /fb\.watch/] },
  instagram: { name: 'Instagram', nameAr: 'إنستغرام', patterns: [/instagram\.com/] },
  twitter: { name: 'X/Twitter', nameAr: 'إكس/تويتر', patterns: [/twitter\.com/, /x\.com/] },
  vimeo: { name: 'Vimeo', nameAr: 'فيميو', patterns: [/vimeo\.com/] },
  reddit: { name: 'Reddit', nameAr: 'ريديت', patterns: [/reddit\.com/] },
  pinterest: { name: 'Pinterest', nameAr: 'بنترست', patterns: [/pinterest\.com/] },
  soundcloud: { name: 'SoundCloud', nameAr: 'ساوند كلاود', patterns: [/soundcloud\.com/] },
};

const DIRECT_EXTS = ['mp4','webm','mov','avi','mkv','jpg','jpeg','png','webp','gif','bmp','svg','mp3','wav','m4a','ogg','flac','aac','pdf','docx','doc','txt','xlsx','csv','zip','rar','7z','tar','gz'];

function detectPlatform(url: string) {
  for (const [key, p] of Object.entries(PLATFORM_MAP)) {
    if (p.patterns.some(r => r.test(url))) return { key, ...p };
  }
  return null;
}

function isDirectFile(url: string) {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return DIRECT_EXTS.some(ext => path.endsWith('.' + ext));
  } catch { return false; }
}

function decodeEntities(t: string) {
  return t.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
}

function unescapeUrl(url: string) {
  return url.replace(/\\u002F/g, '/').replace(/\\\//g, '/').replace(/\\u0026/g, '&');
}

function isImageUrl(url: string): boolean {
  // Filter out URLs that are clearly images or non-video links
  const imagePatterns = [
    /\.image\?/i,
    /tplv-tiktokx-origin\.image/i,
    /\/tos-alisg/i,
    /p16-common-sign/i,
    /p19-common-sign/i,
    /tiktokcdn-us\.com\/tos-alisg/i,
    /\.jpeg/i,
    /\.png/i,
    /\.webp/i,
    /\/obj\/eden/i,  // App download URLs
    /\/download-link\//i,  // App download links
    /\/download$/i,  // Generic download page
    /apple\.com/i,  // App Store links
    /play\.google/i,  // Play Store links
    /musically/i,  // App links
  ];
  // Also filter out page URLs (no file extension pattern)
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    // If path has no extension and doesn't contain /video/ or /tos/, it's probably a page URL
    if (!path.match(/\.\w{2,4}$/) && !path.includes('/video/') && !path.includes('/tos/') && !path.includes('/stream')) {
      return true;
    }
    // Filter out @username paths (social media page URLs)
    if (path.match(/\/@[^/]+\/video\//)) return true;
  } catch {}
  return imagePatterns.some(p => p.test(url));
}

function extractFromHtml(html: string) {
  const videos: Array<{ url: string; quality?: string; mimeType?: string }> = [];
  const seen = new Set<string>();
  const addV = (v: typeof videos[0]) => {
    const cleanUrl = unescapeUrl(v.url);
    if (!seen.has(cleanUrl) && !isImageUrl(cleanUrl)) {
      seen.add(cleanUrl);
      videos.push({ ...v, url: cleanUrl });
    }
  };
  let title: string | undefined;
  let thumbnail: string | undefined;

  // Title
  const tm = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (tm) title = decodeEntities(tm[1].trim());
  const otm = html.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (otm) title = decodeEntities(otm[1].trim());

  // Thumbnail
  const oim = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  if (oim) thumbnail = oim[1];

  // TikTok playAddr & downloadAddr - HIGHEST PRIORITY for TikTok
  const tiktokDownload = html.match(/"downloadAddr":"([^"]+)"/);
  if (tiktokDownload) addV({ url: unescapeUrl(tiktokDownload[1]), quality: 'بدون علامة مائية', mimeType: 'video/mp4' });
  const tiktokPlay = html.match(/"playAddr":"([^"]+)"/);
  if (tiktokPlay) addV({ url: unescapeUrl(tiktokPlay[1]), quality: 'تشغيل', mimeType: 'video/mp4' });

  // YouTube player
  const yt = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/);
  if (yt) {
    try {
      const pd = JSON.parse(yt[1]);
      const sd = pd?.streamingData;
      if (sd?.formats) for (const f of sd.formats) {
        if (f.url) addV({ url: f.url, quality: f.qualityLabel || f.quality, mimeType: f.mimeType?.split(';')[0] });
      }
      if (sd?.adaptiveFormats) for (const f of sd.adaptiveFormats) {
        if (f.url && f.mimeType?.startsWith('video/')) addV({ url: f.url, quality: f.qualityLabel || f.quality, mimeType: f.mimeType?.split(';')[0] });
      }
      if (pd?.videoDetails?.thumbnail?.thumbnails?.[0]?.url) thumbnail = pd.videoDetails.thumbnail.thumbnails[0].url;
      if (pd?.videoDetails?.title) title = pd.videoDetails.title;
    } catch {}
  }

  // og:video
  for (const m of html.matchAll(/property=["']og:video(?::url)?["'][^>]*content=["']([^"']+)["']/gi)) {
    if (m[1]) addV({ url: m[1] });
  }

  // JSON-LD
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const d = JSON.parse(m[1]);
      for (const item of Array.isArray(d) ? d : [d]) {
        if (item.contentUrl) addV({ url: item.contentUrl });
        if (item.embedUrl) addV({ url: item.embedUrl });
      }
    } catch {}
  }

  // Twitter stream
  const ts = html.match(/name=["']twitter:player:stream["'][^>]*content=["']([^"']+)["']/i);
  if (ts) addV({ url: ts[1] });

  // <source> tags
  for (const m of html.matchAll(/<source[^>]*src=["']([^"']+)["'][^>]*>/gi)) {
    if (m[1]) addV({ url: m[1] });
  }

  // Generic video URL patterns in JSON data
  for (const m of html.matchAll(/"(?:video_url|videoUrl|playUrl|play_url|stream_url|downloadUrl|download_url|hdUrl|hd_url)":\s*"([^"]+)"/gi)) {
    if (m[1]) addV({ url: unescapeUrl(m[1]) });
  }

  // Facebook video URLs  
  for (const m of html.matchAll(/"sd_src(?:_no_ratelimit)?":\s*"([^"]+)"/gi)) {
    if (m[1]) addV({ url: unescapeUrl(m[1]), quality: 'SD', mimeType: 'video/mp4' });
  }
  for (const m of html.matchAll(/"hd_src(?:_no_ratelimit)?":\s*"([^"]+)"/gi)) {
    if (m[1]) addV({ url: unescapeUrl(m[1]), quality: 'HD', mimeType: 'video/mp4' });
  }

  // Instagram video URLs
  for (const m of html.matchAll(/"video_versions":\s*\[\{.*?"url":\s*"([^"]+)"/gi)) {
    if (m[1]) addV({ url: unescapeUrl(m[1]), mimeType: 'video/mp4' });
  }

  // Reddit video URLs
  for (const m of html.matchAll(/"fallback_url":\s*"([^"]+\.mp4[^"]*)"/gi)) {
    if (m[1]) addV({ url: unescapeUrl(m[1]), mimeType: 'video/mp4' });
  }

  // Direct .mp4 URLs (filtered)
  for (const m of html.matchAll(/(https?:\/\/[^\s"'<>\\]+\.mp4[^\s"'<>\\]*)/gi)) {
    addV({ url: unescapeUrl(m[1]), mimeType: 'video/mp4' });
  }

  // Escaped URLs with \u002F containing video
  for (const m of html.matchAll(/"(https?:[^"]*\\u002F[^"]*(?:video|play|download)[^"]*)"/gi)) {
    addV({ url: unescapeUrl(m[1]), mimeType: 'video/mp4' });
  }

  // Limit to top 5 results, prioritizing those with quality labels
  const labeled = videos.filter(v => v.quality);
  const unlabeled = videos.filter(v => !v.quality);
  const finalVideos = [...labeled, ...unlabeled].slice(0, 5);

  return { videos: finalVideos, title, thumbnail };
}

async function fetchPageWithZAI(url: string): Promise<string> {
  try {
    const proc = Bun.spawn([
      'z-ai', 'function', '-n', 'page_reader',
      '-a', JSON.stringify({ url }),
      '-o', '/tmp/_extractor_page.json'
    ], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const exitCode = await proc.exited;
    if (exitCode === 0) {
      const file = Bun.file('/tmp/_extractor_page.json');
      if (await file.exists()) {
        const data = await file.json() as { data?: { html?: string } };
        if (data?.data?.html) return data.data.html;
      }
    }
  } catch (err) {
    console.error('z-ai CLI failed:', err);
  }

  // Fallback: direct HTTP fetch
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });
    if (res.ok) return await res.text();
  } catch (err) {
    console.error('Direct fetch failed:', err);
  }

  return '';
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    const path = new URL(req.url).pathname;

    if (req.method === 'GET' && path === '/health') {
      return Response.json({ status: 'ok', port: PORT }, { headers: cors });
    }

    if (req.method === 'POST' && path === '/api/extract') {
      try {
        const body = await req.json() as { url: string };
        const url = body.url;
        if (!url) return Response.json({ error: 'URL required' }, { status: 400, headers: cors });
        try { new URL(url); } catch { return Response.json({ error: 'Invalid URL' }, { status: 400, headers: cors }); }

        const platform = detectPlatform(url);

        // Direct file
        if (isDirectFile(url)) {
          return Response.json({ platform: null, isDirectLink: true, videos: [{ url }], images: [], title: null, thumbnail: null }, { headers: cors });
        }

        // Fetch page content
        const html = await fetchPageWithZAI(url);
        if (!html) {
          return Response.json({ platform, isDirectLink: false, videos: [], images: [], title: null, thumbnail: null, error: 'تعذر الوصول للصفحة' }, { headers: cors });
        }

        const extracted = extractFromHtml(html);
        return Response.json({ platform, isDirectLink: false, ...extracted, images: [] }, { headers: cors });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Extract error:', msg);
        return Response.json({ error: msg }, { status: 500, headers: cors });
      }
    }

    return Response.json({ error: 'Not found' }, { status: 404, headers: cors });
  },
});

console.log(`🎬 Video Extractor on port ${PORT}`);
