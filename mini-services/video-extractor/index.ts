import { spawn } from "child_process";

const PORT = 3031;

interface VideoInfo {
  title: string;
  description: string;
  duration: number;
  thumbnail: string;
  uploader: string;
  uploaderUrl: string;
  webpageUrl: string;
  extractor: string;
  extractorKey: string;
  formats: VideoFormat[];
  isLive: boolean;
  categories: string[];
  tags: string[];
  viewCount: number;
  likeCount: number;
  channel: string;
  channelUrl: string;
}

interface VideoFormat {
  formatId: string;
  ext: string;
  height: number | null;
  width: number | null;
  fps: number | null;
  quality: number;
  filesize: number | null;
  filesizeApprox: number | null;
  vcodec: string;
  acodec: string;
  vbr: number | null;
  abr: number | null;
  tbr: number | null;
  url: string;
  formatNote: string;
  hasVideo: boolean;
  hasAudio: boolean;
  language: string | null;
}

interface BestFormat {
  formatId: string;
  url: string;
  ext: string;
  height: number;
  width: number;
  filesize: number | null;
  filesizeApprox: number | null;
  vcodec: string;
  acodec: string;
  vbr: number | null;
  abr: number | null;
  isBest: boolean;
  isBestAudio: boolean;
}

interface ExtractionResult {
  success: boolean;
  platform: string;
  platformKey: string;
  title: string;
  description: string;
  duration: number;
  thumbnail: string;
  uploader: string;
  channel: string;
  viewCount: number;
  likeCount: number;
  categories: string[];
  isLive: boolean;
  formats: {
    best: BestFormat | null;
    bestAudio: BestFormat | null;
    bestVideo: BestFormat | null;
    allFormats: BestFormat[];
  };
  rawInfo?: VideoInfo;
  error?: string;
}

function extractVideoInfo(url: string): Promise<ExtractionResult> {
  return new Promise((resolve) => {
    const args = [
      "--skip-download",
      "--dump-json",
      "--no-warnings",
      "--no-check-certificates",
      "--user-agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "--referer",
      url,
      url,
    ];

    const proc = spawn("yt-dlp", args, {
      timeout: 120000,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0 || !stdout.trim()) {
        resolve({
          success: false,
          platform: "unknown",
          platformKey: "unknown",
          title: "",
          description: "",
          duration: 0,
          thumbnail: "",
          uploader: "",
          channel: "",
          viewCount: 0,
          likeCount: 0,
          categories: [],
          isLive: false,
          formats: { best: null, bestAudio: null, bestVideo: null, allFormats: [] },
          error: stderr || `yt-dlp exited with code ${code}`,
        });
        return;
      }

      try {
        const info: VideoInfo = JSON.parse(stdout);
        const allFormats: BestFormat[] = (info.formats || [])
          .filter((f: VideoFormat) => f.url || f.formatId)
          .map((f: VideoFormat) => ({
            formatId: f.formatId,
            url: f.url,
            ext: f.ext,
            height: f.height,
            width: f.width,
            filesize: f.filesize,
            filesizeApprox: f.filesizeApprox,
            vcodec: f.vcodec,
            acodec: f.acodec,
            vbr: f.vbr,
            abr: f.abr,
            isBest: false,
            isBestAudio: false,
          }));

        // Find best combined format (video+audio)
        const combinedFormats = allFormats.filter(
          (f) =>
            f.vcodec !== "none" &&
            f.acodec !== "none" &&
            f.url
        );
        const best = combinedFormats.length > 0
          ? combinedFormats.reduce((a, b) =>
              (b.height || 0) > (a.height || 0) ? b : a
            )
          : null;

        if (best) best.isBest = true;

        // Find best video-only format
        const videoOnlyFormats = allFormats.filter(
          (f) => f.vcodec !== "none" && (f.acodec === "none" || !f.acodec) && f.url
        );
        const bestVideo = videoOnlyFormats.length > 0
          ? videoOnlyFormats.reduce((a, b) =>
              (b.height || 0) > (a.height || 0) ? b : a
            )
          : null;

        // Find best audio-only format
        const audioOnlyFormats = allFormats.filter(
          (f) => (f.vcodec === "none" || !f.vcodec) && f.acodec !== "none" && f.url
        );
        const bestAudio = audioOnlyFormats.length > 0
          ? audioOnlyFormats.reduce((a, b) =>
              (b.abr || 0) > (a.abr || 0) ? b : a
            )
          : null;

        if (bestAudio) bestAudio.isBestAudio = true;

        const platformMap: Record<string, string> = {
          youtube: "يوتيوب",
          tiktok: "تيك توك",
          facebook: "فيسبوك",
          instagram: "انستجرام",
          twitter: "تويتر",
          x: "تويتر (X)",
          snapchat: "سناب شات",
          vimeo: "فيميو",
          dailymotion: "ديلي موشن",
          reddit: "ريديت",
          twitch: "تويتش",
          soundcloud: "ساوند كلاود",
          bilibili: "بيليبيلي",
          likee: "لايكي",
          kwai: "كواي",
          pinterest: "بنترست",
          tumblr: "تمبلر",
          streamable: "ستريمابل",
          dropbox: "دروب بوكس",
          google: "جوجل درايف",
          mega: "ميغا",
        };

        const extractorKey = info.extractorKey?.toLowerCase() || "";
        const extractor = info.extractor?.toLowerCase() || "";
        const platformName =
          platformMap[extractorKey] ||
          platformMap[extractorKey.split(":")[0]] ||
          platformMap[extractor] ||
          extractorKey ||
          "منصة أخرى";

        resolve({
          success: true,
          platform: platformName,
          platformKey: extractorKey,
          title: info.title || "",
          description: (info.description || "").substring(0, 500),
          duration: info.duration || 0,
          thumbnail: info.thumbnail || "",
          uploader: info.uploader || "",
          channel: info.channel || info.uploader || "",
          viewCount: info.viewCount || 0,
          likeCount: info.likeCount || 0,
          categories: info.categories || [],
          isLive: info.isLive || false,
          formats: {
            best,
            bestAudio,
            bestVideo,
            allFormats,
          },
          rawInfo: info,
        });
      } catch (err: unknown) {
        resolve({
          success: false,
          platform: "unknown",
          platformKey: "unknown",
          title: "",
          description: "",
          duration: 0,
          thumbnail: "",
          uploader: "",
          channel: "",
          viewCount: 0,
          likeCount: 0,
          categories: [],
          isLive: false,
          formats: { best: null, bestAudio: null, bestVideo: null, allFormats: [] },
          error: `Failed to parse yt-dlp output: ${err}`,
        });
      }
    });

    proc.on("error", (err) => {
      resolve({
        success: false,
        platform: "unknown",
        platformKey: "unknown",
        title: "",
        description: "",
        duration: 0,
        thumbnail: "",
        uploader: "",
        channel: "",
        viewCount: 0,
        likeCount: 0,
        categories: [],
        isLive: false,
        formats: { best: null, bestAudio: null, bestVideo: null, allFormats: [] },
        error: `Failed to spawn yt-dlp: ${err.message}`,
      });
    });
  });
}

// Also handle direct download URL generation using yt-dlp
function getDownloadUrl(url: string, formatId?: string): Promise<{ url: string; filename: string; ext: string; error?: string }> {
  return new Promise((resolve) => {
    const args = [
      "--skip-download",
      "--get-url",
      "--no-warnings",
      "--no-check-certificates",
      "--user-agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ];

    if (formatId) {
      args.push("-f", formatId);
    } else {
      args.push("-f", "best[ext=mp4]/best");
    }

    args.push(url);

    const proc = spawn("yt-dlp", args, {
      timeout: 60000,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0 || !stdout.trim()) {
        resolve({
          url: "",
          filename: "",
          ext: "mp4",
          error: stderr || `yt-dlp get-url exited with code ${code}`,
        });
        return;
      }

      const urls = stdout.trim().split("\n").filter(Boolean);
      resolve({
        url: urls[0],
        filename: "",
        ext: formatId ? "mp4" : "mp4",
      });
    });

    proc.on("error", (err) => {
      resolve({
        url: "",
        filename: "",
        ext: "mp4",
        error: `Failed to spawn yt-dlp: ${err.message}`,
      });
    });
  });
}

// Get filename
function getFilename(url: string, formatId?: string): Promise<string> {
  return new Promise((resolve) => {
    const args = [
      "--skip-download",
      "--get-filename",
      "--no-warnings",
      "--no-check-certificates",
    ];

    if (formatId) {
      args.push("-f", formatId);
    } else {
      args.push("-f", "best[ext=mp4]/best");
    }

    args.push("-o", "%(title)s.%(ext)s", url);

    const proc = spawn("yt-dlp", args, {
      timeout: 60000,
    });

    let stdout = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.on("close", () => {
      resolve(stdout.trim() || "video.mp4");
    });

    proc.on("error", () => {
      resolve("video.mp4");
    });
  });
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", service: "video-extractor", ytDlpVersion: "2026.03.17" });
    }

    // Extract video info
    if (url.pathname === "/api/extract" && req.method === "POST") {
      try {
        const body = await req.json() as { url: string };
        const targetUrl = body.url;

        if (!targetUrl) {
          return Response.json({ success: false, error: "URL is required" }, { status: 400 });
        }

        console.log(`[video-extractor] Extracting: ${targetUrl}`);
        const result = await extractVideoInfo(targetUrl);
        console.log(`[video-extractor] Result: ${result.success ? "OK" : "FAILED"} - ${result.title || result.error}`);

        return Response.json(result);
      } catch (err: unknown) {
        return Response.json({
          success: false,
          error: `Server error: ${err instanceof Error ? err.message : String(err)}`,
        }, { status: 500 });
      }
    }

    // Get download URL
    if (url.pathname === "/api/download-url" && req.method === "POST") {
      try {
        const body = await req.json() as { url: string; formatId?: string };
        const targetUrl = body.url;
        const formatId = body.formatId;

        if (!targetUrl) {
          return Response.json({ success: false, error: "URL is required" }, { status: 400 });
        }

        console.log(`[video-extractor] Getting download URL: ${targetUrl} (format: ${formatId || "best"})`);
        const [dlResult, filename] = await Promise.all([
          getDownloadUrl(targetUrl, formatId),
          getFilename(targetUrl, formatId),
        ]);

        if (dlResult.error) {
          return Response.json({ success: false, error: dlResult.error });
        }

        return Response.json({
          success: true,
          downloadUrl: dlResult.url,
          filename,
          ext: dlResult.ext,
        });
      } catch (err: unknown) {
        return Response.json({
          success: false,
          error: `Server error: ${err instanceof Error ? err.message : String(err)}`,
        }, { status: 500 });
      }
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
});

console.log(`[video-extractor] Server running on port ${PORT}`);
