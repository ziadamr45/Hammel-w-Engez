'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Search, Loader2, Sparkles, ArrowDownToLine, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/app-store';
import type { AnalysisResult } from '@/lib/file-utils';
import { isValidUrl } from '@/lib/file-utils';

interface UrlInputProps {
  onAnalyze: (url: string) => Promise<AnalysisResult | null>;
}

export function UrlInput({ onAnalyze }: UrlInputProps) {
  const [url, setUrl] = useState('');
  const { isAnalyzing, setAnalysisResult, setIsAnalyzing, setAnalysisError } = useAppStore();
  const [isFocused, setIsFocused] = useState(false);

  const handleAnalyze = useCallback(async () => {
    if (!url.trim()) return;

    if (!isValidUrl(url.trim())) {
      setAnalysisError('الرابط غير صالح، يرجى إدخال رابط يبدأ بـ http:// أو https://');
      return;
    }

    setAnalysisError(null);
    setAnalysisResult(null);
    setIsAnalyzing(true);

    try {
      const result = await onAnalyze(url.trim());
      if (result) {
        setAnalysisResult(result);
      }
    } catch {
      setAnalysisError('حدث خطأ أثناء تحليل الرابط');
    } finally {
      setIsAnalyzing(false);
    }
  }, [url, onAnalyze, setAnalysisResult, setIsAnalyzing, setAnalysisError]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch {
      // Clipboard access denied
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isAnalyzing) {
        handleAnalyze();
      }
    },
    [handleAnalyze, isAnalyzing]
  );

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Main input card */}
      <motion.div
        className={`
          relative rounded-2xl transition-all duration-300
          ${isFocused
            ? 'ring-2 ring-primary/30 shadow-xl shadow-primary/5 border-primary/50'
            : 'border-border/60 shadow-lg shadow-black/[0.03] dark:shadow-black/20'
          }
          bg-card
        `}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center gap-2 p-2">
          {/* Icon */}
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary shrink-0">
            {isAnalyzing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Link2 className="w-5 h-5" />
            )}
          </div>

          {/* Input */}
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="الصق الرابط هنا... (فيديو، صورة، صوت، مستند، أو أي ملف)"
            className="flex-1 h-12 border-0 bg-transparent text-base focus-visible:ring-0 placeholder:text-muted-foreground/50"
            dir="ltr"
            disabled={isAnalyzing}
          />

          {/* Paste button */}
          {!url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePaste}
              className="shrink-0 text-muted-foreground hover:text-foreground gap-1.5 rounded-xl"
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span className="text-xs">لصق</span>
            </Button>
          )}

          {/* Analyze button */}
          <Button
            onClick={handleAnalyze}
            disabled={!url.trim() || isAnalyzing}
            className="shrink-0 h-12 px-5 rounded-xl gap-2 font-semibold shadow-md shadow-primary/20"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري التحليل
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                تحليل الرابط
              </>
            )}
          </Button>
        </div>

        {/* Animated progress bar */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              exit={{ scaleX: 0, opacity: 0 }}
              transition={{ duration: 2.5, ease: 'easeInOut' }}
              className="h-1 bg-gradient-to-l from-primary via-primary/60 to-primary/30 origin-right"
              style={{ borderRadius: '0 0 1rem 1rem' }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Quick hints */}
      <motion.div
        className="flex items-center justify-center gap-5 mt-4 text-[11px] text-muted-foreground/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          <span>تحليل تلقائي للملفات</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowDownToLine className="w-3 h-3" />
          <span>تحميل مباشر بدون علامة مائية</span>
        </div>
      </motion.div>
    </div>
  );
}
