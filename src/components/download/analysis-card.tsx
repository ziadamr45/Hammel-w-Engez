'use client';

import { motion } from 'framer-motion';
import {
  Video,
  Image as ImageIcon,
  Music,
  FileText,
  Archive,
  FileQuestion,
  ExternalLink,
  Download,
  Copy,
  Globe,
  HardDrive,
  FileType,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  Star,
  Play,
  Clock,
  User,
  Eye as EyeIcon,
  Heart,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FILE_CATEGORIES, type FileCategory, type QualityOption } from '@/lib/file-utils';
import type { AnalysisResult } from '@/lib/file-utils';
import { useState, useCallback } from 'react';

interface AnalysisCardProps {
  result: AnalysisResult;
  onDownload: (result: AnalysisResult, customFilename?: string, downloadUrl?: string) => Promise<void>;
  onClear: () => void;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Video,
  image: ImageIcon,
  audio: Music,
  document: FileText,
  archive: Archive,
  unknown: FileQuestion,
};

const CATEGORY_ACCENTS: Record<string, string> = {
  video: 'from-rose-500 to-rose-600',
  image: 'from-emerald-500 to-emerald-600',
  audio: 'from-violet-500 to-violet-600',
  document: 'from-amber-500 to-amber-600',
  archive: 'from-cyan-500 to-cyan-600',
  unknown: 'from-gray-500 to-gray-600',
};

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatCount(count: number): string {
  if (!count) return '0';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export function AnalysisCard({ result, onDownload, onClear }: AnalysisCardProps) {
  const [customFilename, setCustomFilename] = useState(result.extractorTitle || result.filename);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [selectedQualityIdx, setSelectedQualityIdx] = useState(0);

  const categoryConfig = result.category !== 'unknown'
    ? FILE_CATEGORIES[result.category as FileCategory]
    : null;

  const CategoryIcon = CATEGORY_ICONS[result.category] || FileQuestion;
  const accentGradient = CATEGORY_ACCENTS[result.category] || CATEGORY_ACCENTS.unknown;

  // Quality options from extractor
  const qualityOptions = result.qualityOptions || [];
  const hasQualityOptions = qualityOptions.length > 0;
  const selectedQuality: QualityOption | null = qualityOptions[selectedQualityIdx] || null;

  const isSocialMedia = result.needsExtractorDownload || false;

  // Get the download URL - for direct links it's the original URL,
  // for social media we use the proxy endpoint
  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    setDownloadProgress(0);

    const progressInterval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 85) { clearInterval(progressInterval); return 85; }
        return prev + Math.random() * 8;
      });
    }, 400);

    try {
      if (isSocialMedia) {
        // For social media: use the proxy-download endpoint which
        // calls yt-dlp to get the actual URL and streams the file
        const formatId = selectedQuality?.formatId || '';
        const filename = (customFilename || result.filename).includes('.')
          ? customFilename || result.filename
          : `${customFilename || result.filename}.${selectedQuality?.ext || result.extension || 'mp4'}`;

        const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(result.originalUrl || result.url)}&formatId=${encodeURIComponent(formatId)}&filename=${encodeURIComponent(filename)}`;

        // Save the download record
        await onDownload(result, filename);

        // Trigger the actual file download via proxy
        const a = document.createElement('a');
        a.href = proxyUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setDownloadProgress(100);
      } else {
        // Direct file link download
        const actualUrl = result.url;
        await onDownload(result, customFilename || result.filename, actualUrl);

        const a = document.createElement('a');
        a.href = actualUrl;
        a.download = customFilename || result.filename;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setDownloadProgress(100);
      }
    } catch {
      setDownloadProgress(0);
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => { setIsDownloading(false); setDownloadProgress(0); }, 1200);
    }
  }, [result, customFilename, selectedQuality, isSocialMedia, onDownload]);

  // Copy the original URL
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(result.originalUrl || result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* denied */ }
  }, [result.url, result.originalUrl]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Card className="overflow-hidden border-2 shadow-xl">
        <div className={`h-1.5 bg-gradient-to-l ${accentGradient}`} />

        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-start gap-4 min-w-0">
              {/* Thumbnail or Icon */}
              {result.extractorThumbnail ? (
                <div className="shrink-0 w-28 h-20 rounded-xl overflow-hidden border bg-muted/30 relative">
                  <img
                    src={result.extractorThumbnail}
                    alt="صورة مصغرة"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  {result.extractorDuration ? (
                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-white text-[10px] font-mono">
                      {formatDuration(result.extractorDuration)}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className={`shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl ${categoryConfig?.bgColor || 'bg-gray-500/10'} shadow-sm`}>
                  <CategoryIcon className={`w-7 h-7 ${categoryConfig?.color || 'text-gray-500'}`} />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Badge variant="secondary" className="text-xs font-medium">
                    {categoryConfig?.label || 'غير معروف'}
                  </Badge>
                  {result.extension && (
                    <Badge variant="outline" className="text-xs font-mono uppercase">.{result.extension}</Badge>
                  )}
                  {result.extractorPlatform ? (
                    <Badge variant="outline" className="text-xs gap-1 border-primary/20 bg-primary/5">
                      <Globe className="w-3 h-3" />
                      {result.extractorPlatform.nameAr}
                    </Badge>
                  ) : result.source ? (
                    <Badge variant="outline" className="text-xs gap-1 border-primary/20">
                      <Globe className="w-3 h-3" />
                      {result.source}
                    </Badge>
                  ) : null}
                </div>
                <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2" dir="auto">
                  {result.extractorTitle || result.filename}
                </h3>
                {result.extractorUploader && (
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    <User className="w-3 h-3" />
                    {result.extractorUploader}
                  </div>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClear} className="shrink-0 h-8 w-8 rounded-xl">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Stats row for social media */}
          {isSocialMedia && (result.extractorViewCount || result.extractorLikeCount || result.extractorDuration) && (
            <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
              {result.extractorViewCount ? (
                <div className="flex items-center gap-1.5">
                  <EyeIcon className="w-3.5 h-3.5" />
                  <span>{formatCount(result.extractorViewCount)} مشاهدة</span>
                </div>
              ) : null}
              {result.extractorLikeCount ? (
                <div className="flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5" />
                  <span>{formatCount(result.extractorLikeCount)} إعجاب</span>
                </div>
              ) : null}
              {result.extractorDuration ? (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDuration(result.extractorDuration)}</span>
                </div>
              ) : null}
            </div>
          )}

          {/* Status indicator */}
          {isSocialMedia ? (
            <div className="flex items-center gap-2.5 p-3.5 mb-5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm border border-emerald-500/20">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>
                تم العثور على الفيديو من {result.extractorPlatform?.nameAr || 'المنصة'} — جاهز للتحميل بدون علامة مائية ✨
              </span>
            </div>
          ) : !result.isDirectLink ? (
            <div className="flex items-center gap-2.5 p-3.5 mb-5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>هذا الرابط قد لا يكون رابط ملف مباشر. جرب رابط التحميل المباشر.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 p-3.5 mb-5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm border border-emerald-500/20">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>رابط مباشر — جاهز للتحميل فورًا</span>
            </div>
          )}

          {/* Metadata grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
            <MetadataItem icon={<FileType className="w-4 h-4" />} label="النوع" value={categoryConfig?.label || 'غير معروف'} />
            <MetadataItem icon={<HardDrive className="w-4 h-4" />} label="الحجم" value={result.fileSize || (selectedQuality?.fileSize) || 'غير معروف'} />
            <MetadataItem icon={<FileQuestion className="w-4 h-4" />} label="الامتداد" value={`.${(selectedQuality?.ext || result.extension || 'mp4').toUpperCase()}`} />
            <MetadataItem icon={<Globe className="w-4 h-4" />} label="المصدر" value={result.extractorPlatform?.nameAr || result.source || 'مباشر'} />
          </div>

          {/* Quality selector for social media */}
          {isSocialMedia && hasQualityOptions && (
            <div className="mb-5">
              <label className="text-xs font-medium text-muted-foreground mb-2 block">اختر جودة التحميل</label>
              <div className="flex flex-wrap gap-2">
                {qualityOptions.map((option, idx) => (
                  <Button
                    key={idx}
                    variant={selectedQualityIdx === idx ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedQualityIdx(idx)}
                    className="gap-1.5 text-xs rounded-xl"
                  >
                    {idx === 0 ? <Star className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    {option.quality}
                    {option.hasAudio && option.hasVideo ? '' : option.hasAudio ? ' 🔊' : ' 🎬'}
                    {option.fileSize && <span className="opacity-60">({option.fileSize})</span>}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Preview for direct files (not social media) */}
          {result.canPreview && !isSocialMedia && (
            <div className="mb-5 rounded-xl overflow-hidden border bg-muted/30">
              <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-muted/50 text-xs text-muted-foreground">
                <Eye className="w-3 h-3" />
                معاينة الملف
              </div>
              <FilePreview result={result} />
            </div>
          )}

          {/* Rename input */}
          <div className="mb-5">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">إعادة تسمية الملف (اختياري)</label>
            <Input
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              placeholder={result.filename}
              className="h-11 text-sm rounded-xl"
              dir="ltr"
            />
          </div>

          {/* Download progress */}
          {isDownloading && (
            <div className="mb-5">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>{isSocialMedia ? 'جاري استخراج وتحميل الفيديو...' : 'جاري التحميل...'}</span>
                <span className="font-mono">{Math.round(downloadProgress)}%</span>
              </div>
              <Progress value={downloadProgress} className="h-2.5" />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className={`gap-2 flex-1 sm:flex-none min-w-[180px] shadow-md ${isDownloading ? '' : 'shadow-primary/20 hover:shadow-lg hover:shadow-primary/30'}`}
              size="lg"
            >
              <Download className="w-4 h-4" />
              {isDownloading
                ? 'جاري التحميل...'
                : isSocialMedia
                  ? `تحميل ${selectedQuality?.quality || 'الفيديو'}`
                  : 'تحميل الملف'}
            </Button>

            <Button variant="outline" onClick={handleCopyLink} className="gap-2 rounded-xl" size="lg">
              {copied ? (
                <><CheckCircle className="w-4 h-4 text-emerald-500" /> تم النسخ</>
              ) : (
                <><Copy className="w-4 h-4" /> نسخ الرابط</>
              )}
            </Button>

            {!isSocialMedia && (
              <Button variant="outline" onClick={() => window.open(result.url, '_blank')} className="gap-2 rounded-xl" size="lg">
                <ExternalLink className="w-4 h-4" /> فتح
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MetadataItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/30">
      <div className="text-muted-foreground/70">{icon}</div>
      <div>
        <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
        <p className="text-xs font-semibold">{value}</p>
      </div>
    </div>
  );
}

function FilePreview({ result }: { result: AnalysisResult }) {
  if (result.category === 'image') {
    return (
      <div className="relative max-h-72 overflow-hidden flex items-center justify-center bg-muted/20">
        <img src={result.url} alt="معاينة" className="max-h-72 object-contain" loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      </div>
    );
  }
  if (result.category === 'video') {
    return (
      <div className="max-h-72 flex items-center justify-center bg-black/5 dark:bg-white/5">
        <video src={result.url} controls className="max-h-72 w-full" preload="metadata">متصفحك لا يدعم الفيديو</video>
      </div>
    );
  }
  if (result.category === 'audio') {
    return (
      <div className="p-6 flex flex-col items-center gap-3">
        <Music className="w-12 h-12 text-violet-500" />
        <audio src={result.url} controls className="w-full" preload="metadata">متصفحك لا يدعم الصوت</audio>
      </div>
    );
  }
  if (result.category === 'document' && result.extension === 'pdf') {
    return <div className="h-72"><iframe src={result.url} className="w-full h-full" title="معاينة PDF" /></div>;
  }
  return null;
}
