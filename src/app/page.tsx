'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Settings,
  ListPlus,
  Shield,
  Zap,
  Globe,
  Sparkles,
  ArrowDownToLine,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { UrlInput } from '@/components/download/url-input';
import { AnalysisCard } from '@/components/download/analysis-card';
import { DownloadsHistory } from '@/components/download/downloads-history';
import { SettingsDialog } from '@/components/download/settings-dialog';
import { BatchDownload } from '@/components/download/batch-download';
import type { AnalysisResult } from '@/lib/file-utils';

function AppContent() {
  const {
    analysisResult,
    setAnalysisResult,
    analysisError,
    setAnalysisError,
    setIsAnalyzing,
    addDownload,
    settings,
    setSettings,
  } = useAppStore();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  }, [setSettings]);

  useEffect(() => {
    setMounted(true);
    fetchSettings();
  }, [fetchSettings]);

  // Scroll to top detection
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Analyze URL
  const handleAnalyze = useCallback(
    async (url: string): Promise<AnalysisResult | null> => {
      setIsAnalyzing(true);
      setAnalysisError(null);

      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        const data = await res.json();

        if (!res.ok) {
          setAnalysisError(data.error || 'حدث خطأ أثناء التحليل');
          return null;
        }

        return data as AnalysisResult;
      } catch {
        setAnalysisError('حدث خطأ في الاتصال بالخادم');
        return null;
      } finally {
        setIsAnalyzing(false);
      }
    },
    [setIsAnalyzing, setAnalysisError]
  );

  // Download file - saves to history only, actual download is handled by AnalysisCard
  const handleDownload = useCallback(
    async (result: AnalysisResult, customFilename?: string, _downloadUrl?: string) => {
      try {
        const res = await fetch('/api/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: result.originalUrl || result.url,
            originalUrl: result.originalUrl || result.url,
            filename: customFilename || result.filename,
            category: result.category,
            source: result.extractorPlatform?.name || result.source,
            thumbnailUrl: result.extractorThumbnail || result.thumbnailUrl,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          addDownload(data);
        }
      } catch (error) {
        console.error('Download record failed:', error);
      }
    },
    [addDownload]
  );

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-l from-primary to-foreground bg-clip-text text-transparent">
                حمل و انجز
              </h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5 font-medium">
                حمّل من أي منصة في العالم
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBatchOpen(true)}
              className="gap-1.5 text-xs hidden sm:flex rounded-xl"
            >
              <ListPlus className="w-3.5 h-3.5" />
              تحميل جماعي
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBatchOpen(true)}
              className="gap-1.5 text-xs sm:hidden rounded-xl"
            >
              <ListPlus className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="h-9 w-9 rounded-xl"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-10 left-1/4 w-80 h-80 bg-primary/5 rounded-full blur-[100px] animate-pulse-glow" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.02] rounded-full blur-[80px]" />
          </div>

          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 -z-10 opacity-[0.015] dark:opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-6 sm:pt-16 sm:pb-10">
            {/* Title */}
            <motion.div
              className="text-center mb-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-5 border border-primary/20"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.4 }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                الأسرع والأقوى في تحميل الملفات
              </motion.div>
              <motion.h2
                className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                حمّل أي ملف
                <span className="bg-gradient-to-l from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent"> من أي رابط</span>
              </motion.h2>
              <motion.p
                className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto leading-relaxed"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                حمّل الفيديوهات من أي منصة في العالم — يوتيوب، تيك توك، فيسبوك، انستجرام، تويتر، كواي، سناب شات، وأكثر من 1800 منصة
                <span className="text-primary font-medium"> بدون علامة مائية</span>
              </motion.p>
            </motion.div>

            {/* URL Input */}
            <UrlInput onAnalyze={handleAnalyze} />

            {/* Error message */}
            <AnimatePresence>
              {analysisError && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  className="mt-4 p-3.5 rounded-xl bg-destructive/10 text-destructive text-sm text-center max-w-3xl mx-auto border border-destructive/20"
                >
                  {analysisError}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Analysis Result */}
        <AnimatePresence>
          {analysisResult && (
            <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-8">
              <AnalysisCard
                result={analysisResult}
                onDownload={handleDownload}
                onClear={() => setAnalysisResult(null)}
              />
            </section>
          )}
        </AnimatePresence>

        {/* Features grid + Supported platforms (when no analysis) */}
        {!analysisResult && (
          <>
            <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: Zap, label: 'تحميل فائق السرعة', desc: 'بدون انتظار أو تأخير', gradient: 'from-amber-500/10 to-orange-500/10', iconColor: 'text-amber-600 dark:text-amber-400' },
                  { icon: Shield, label: 'بدون علامة مائية', desc: 'ملف نظيف 100%', gradient: 'from-emerald-500/10 to-teal-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
                  { icon: Globe, label: '+1800 منصة مدعومة', desc: 'YouTube, TikTok, Facebook...', gradient: 'from-rose-500/10 to-pink-500/10', iconColor: 'text-rose-600 dark:text-rose-400' },
                  { icon: ArrowDownToLine, label: 'اختر الجودة', desc: '360p حتى 4K', gradient: 'from-violet-500/10 to-purple-500/10', iconColor: 'text-violet-600 dark:text-violet-400' },
                ].map((feature, index) => (
                  <motion.div
                    key={feature.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.08, duration: 0.5 }}
                    whileHover={{ y: -2, transition: { duration: 0.2 } }}
                    className="flex flex-col items-center gap-2.5 p-5 rounded-2xl bg-card border border-border/50 text-center hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                  >
                    <div className={`flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${feature.gradient}`}>
                      <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
                    </div>
                    <p className="text-sm font-semibold">{feature.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Supported platforms */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-10">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="text-center"
              >
                <p className="text-xs text-muted-foreground mb-3">المنصات المدعومة</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {[
                    { name: 'YouTube', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
                    { name: 'TikTok', color: 'bg-gray-800/10 text-gray-700 dark:text-gray-300 border-gray-500/20' },
                    { name: 'Facebook', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
                    { name: 'Instagram', color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20' },
                    { name: 'Twitter / X', color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
                    { name: 'Snapchat', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' },
                    { name: 'Kwai', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
                    { name: 'Likee', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
                    { name: 'Vimeo', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' },
                    { name: 'Reddit', color: 'bg-orange-600/10 text-orange-700 dark:text-orange-400 border-orange-600/20' },
                    { name: 'SoundCloud', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
                    { name: 'Pinterest', color: 'bg-red-600/10 text-red-700 dark:text-red-300 border-red-600/20' },
                    { name: 'Rumble', color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' },
                    { name: 'Twitch', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
                    { name: '+1800 منصة أخرى', color: 'bg-primary/10 text-primary border-primary/20' },
                  ].map((platform) => (
                    <span
                      key={platform.name}
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium border ${platform.color}`}
                    >
                      {platform.name}
                    </span>
                  ))}
                </div>
              </motion.div>
            </section>
          </>
        )}

        {/* Downloads History */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
          <DownloadsHistory />
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-card/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-5 h-5 rounded-md bg-primary/10">
              <Download className="w-3 h-3 text-primary" />
            </div>
            <span className="font-medium">حمل و انجز © {new Date().getFullYear()}</span>
          </div>
          <p>تحميل سريع وآمن من أي منصة — بدون علامة مائية — +1800 منصة مدعومة</p>
        </div>
      </footer>

      {/* Scroll to top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-6 left-6 z-30"
          >
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="h-10 w-10 rounded-full shadow-lg bg-background border-border/50 hover:border-primary/30"
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialogs */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <BatchDownload
        open={batchOpen}
        onOpenChange={setBatchOpen}
        onAnalyze={handleAnalyze}
        onDownload={handleDownload}
      />
    </div>
  );
}

export default function Home() {
  return <AppContent />;
}
