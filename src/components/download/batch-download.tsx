'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListPlus,
  X,
  Plus,
  Loader2,
  Download,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/app-store';
import type { AnalysisResult } from '@/lib/file-utils';
import { isValidUrl } from '@/lib/file-utils';

interface BatchDownloadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnalyze: (url: string) => Promise<AnalysisResult | null>;
  onDownload: (result: AnalysisResult, customFilename?: string) => Promise<void>;
}

interface BatchItem {
  url: string;
  status: 'pending' | 'analyzing' | 'downloading' | 'completed' | 'failed';
  result: AnalysisResult | null;
  error: string | null;
}

export function BatchDownload({ open, onOpenChange, onAnalyze, onDownload }: BatchDownloadProps) {
  const [urls, setUrls] = useState<string[]>(['']);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);

  const addUrlField = useCallback(() => {
    setUrls((prev) => [...prev, '']);
  }, []);

  const removeUrlField = useCallback((index: number) => {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateUrl = useCallback((index: number, value: string) => {
    setUrls((prev) => prev.map((u, i) => (i === index ? value : u)));
  }, []);

  const startBatchDownload = useCallback(async () => {
    const validUrls = urls.filter((u) => u.trim() && isValidUrl(u.trim()));
    if (validUrls.length === 0) return;

    const items: BatchItem[] = validUrls.map((url) => ({
      url: url.trim(),
      status: 'pending',
      result: null,
      error: null,
    }));

    setBatchItems(items);
    setIsProcessing(true);

    for (let i = 0; i < items.length; i++) {
      setCurrentIdx(i);
      setBatchItems((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: 'analyzing' } : item))
      );

      try {
        const result = await onAnalyze(items[i].url);
        if (result) {
          setBatchItems((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, status: 'downloading', result } : item
            )
          );

          await onDownload(result);
          setBatchItems((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, status: 'completed' } : item
            )
          );
        } else {
          setBatchItems((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? { ...item, status: 'failed', error: 'فشل في تحليل الرابط' }
                : item
            )
          );
        }
      } catch {
        setBatchItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? { ...item, status: 'failed', error: 'حدث خطأ أثناء المعالجة' }
              : item
          )
        );
      }
    }

    setIsProcessing(false);
    setCurrentIdx(-1);
  }, [urls, onAnalyze, onDownload]);

  const completedCount = batchItems.filter((i) => i.status === 'completed').length;
  const failedCount = batchItems.filter((i) => i.status === 'failed').length;
  const progressPercent =
    batchItems.length > 0
      ? ((completedCount + failedCount) / batchItems.length) * 100
      : 0;

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => !isProcessing && onOpenChange(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 top-[5%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-xl z-50 max-h-[90vh] overflow-y-auto"
          >
            <Card className="border-2 shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ListPlus className="w-5 h-5" />
                  تحميل جماعي
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => !isProcessing && onOpenChange(false)}
                  className="h-8 w-8"
                  disabled={isProcessing}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* URL input fields */}
                {batchItems.length === 0 ? (
                  <div className="space-y-2">
                    {urls.map((url, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={url}
                          onChange={(e) => updateUrl(index, e.target.value)}
                          placeholder={`الرابط ${index + 1}...`}
                          dir="ltr"
                          className="h-10 text-sm"
                          disabled={isProcessing}
                        />
                        {urls.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => removeUrlField(index)}
                            disabled={isProcessing}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addUrlField}
                      className="w-full gap-1.5"
                      disabled={isProcessing}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إضافة رابط آخر
                    </Button>

                    <Button
                      onClick={startBatchDownload}
                      disabled={urls.every((u) => !u.trim())}
                      className="w-full gap-2"
                      size="lg"
                    >
                      <Download className="w-4 h-4" />
                      بدء التحميل الجماعي
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Progress */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                        <span>
                          التقدم: {completedCount} من {batchItems.length}
                        </span>
                        <span>{Math.round(progressPercent)}%</span>
                      </div>
                      <Progress value={progressPercent} className="h-2" />
                    </div>

                    {/* Items list */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {batchItems.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm"
                        >
                          {item.status === 'pending' && (
                            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                          )}
                          {item.status === 'analyzing' && (
                            <Loader2 className="w-5 h-5 shrink-0 animate-spin text-primary" />
                          )}
                          {item.status === 'downloading' && (
                            <Loader2 className="w-5 h-5 shrink-0 animate-spin text-amber-500" />
                          )}
                          {item.status === 'completed' && (
                            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
                          )}
                          {item.status === 'failed' && (
                            <AlertTriangle className="w-5 h-5 shrink-0 text-destructive" />
                          )}

                          <span className="flex-1 truncate" dir="ltr">
                            {item.url}
                          </span>

                          <Badge
                            variant={
                              item.status === 'completed'
                                ? 'default'
                                : item.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="text-[10px] shrink-0"
                          >
                            {item.status === 'pending' && 'في الانتظار'}
                            {item.status === 'analyzing' && 'تحليل'}
                            {item.status === 'downloading' && 'تحميل'}
                            {item.status === 'completed' && 'مكتمل'}
                            {item.status === 'failed' && 'فشل'}
                          </Badge>
                        </div>
                      ))}
                    </div>

                    {/* Done */}
                    {!isProcessing && (
                      <Button
                        onClick={() => {
                          setBatchItems([]);
                          setUrls(['']);
                          onOpenChange(false);
                        }}
                        className="w-full"
                        size="lg"
                      >
                        تم
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
