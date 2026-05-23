'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  Image as ImageIcon,
  Music,
  FileText,
  Archive,
  LayoutGrid,
  Star,
  Clock,
  Download,
  Trash2,
  Copy,
  ExternalLink,
  Search,
  X,
  MoreVertical,
  FolderOpen,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore, type DownloadRecord } from '@/store/app-store';
import { FILE_CATEGORIES, type FileCategory } from '@/lib/file-utils';
import { useState, useCallback, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const FILTERS = [
  { key: 'all', label: 'الكل', icon: LayoutGrid, color: '' },
  { key: 'video', label: 'فيديو', icon: Video, color: 'text-rose-500' },
  { key: 'image', label: 'صور', icon: ImageIcon, color: 'text-emerald-500' },
  { key: 'audio', label: 'صوت', icon: Music, color: 'text-violet-500' },
  { key: 'document', label: 'مستندات', icon: FileText, color: 'text-amber-500' },
  { key: 'archive', label: 'أرشيفات', icon: Archive, color: 'text-cyan-500' },
];

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Video,
  image: ImageIcon,
  audio: Music,
  document: FileText,
  archive: Archive,
};

export function DownloadsHistory() {
  const {
    downloads,
    setDownloads,
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    removeDownload,
    updateDownload,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState('recent');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchDownloads = useCallback(async () => {
    try {
      const res = await fetch('/api/downloads?limit=100');
      if (res.ok) {
        const data = await res.json();
        setDownloads(data);
      }
    } catch (error) {
      console.error('Failed to fetch downloads:', error);
    }
  }, [setDownloads]);

  // Fetch downloads on mount
  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);

  const handleToggleFavorite = useCallback(
    async (id: string, currentVal: boolean) => {
      try {
        const res = await fetch(`/api/downloads/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isFavorite: !currentVal }),
        });
        if (res.ok) {
          updateDownload(id, { isFavorite: !currentVal });
        }
      } catch (error) {
        console.error('Failed to toggle favorite:', error);
      }
    },
    [updateDownload]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/downloads/${id}`, { method: 'DELETE' });
        if (res.ok) {
          removeDownload(id);
        }
      } catch (error) {
        console.error('Failed to delete download:', error);
      }
    },
    [removeDownload]
  );

  const handleCopyLink = useCallback(async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard denied
    }
  }, []);

  const handleClearHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/downloads?action=clear-all', { method: 'DELETE' });
      if (res.ok) {
        setDownloads([]);
      }
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }, [setDownloads]);

  // Filter downloads
  const filtered = downloads.filter((item) => {
    const matchesFilter =
      activeFilter === 'all' || item.fileType === activeFilter;
    const matchesSearch =
      !searchQuery ||
      item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.source && item.source.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const recentItems = filtered.slice(0, 20);
  const favoriteItems = filtered.filter((item) => item.isFavorite);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;
    return date.toLocaleDateString('ar-EG');
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث في السجل..."
            className="pr-10 h-11 rounded-xl"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.key;
            return (
              <Button
                key={filter.key}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter(filter.key)}
                className="gap-1.5 shrink-0 rounded-full px-4 text-xs"
              >
                <Icon className={`w-3.5 h-3.5 ${filter.color && !isActive ? filter.color : ''}`} />
                {filter.label}
                {filter.key !== 'all' && (
                  <span className="text-[10px] opacity-70">
                    ({downloads.filter((d) => d.fileType === filter.key).length})
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="recent" className="gap-1.5 text-xs">
              <Clock className="w-3.5 h-3.5" />
              الملفات الحديثة
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-1.5 text-xs">
              <Star className="w-3.5 h-3.5" />
              المفضلة
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />
              سجل التحميل
            </TabsTrigger>
          </TabsList>

          {downloads.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearHistory}
              className="text-destructive hover:text-destructive text-xs gap-1"
            >
              <Trash2 className="w-3 h-3" />
              مسح الكل
            </Button>
          )}
        </div>

        <TabsContent value="recent">
          <DownloadList items={recentItems} onToggleFavorite={handleToggleFavorite} onDelete={handleDelete} onCopyLink={handleCopyLink} copiedId={copiedId} formatDate={formatDate} emptyMessage="لا توجد ملفات حديثة" />
        </TabsContent>

        <TabsContent value="favorites">
          <DownloadList items={favoriteItems} onToggleFavorite={handleToggleFavorite} onDelete={handleDelete} onCopyLink={handleCopyLink} copiedId={copiedId} formatDate={formatDate} emptyMessage="لا توجد ملفات مفضلة" />
        </TabsContent>

        <TabsContent value="all">
          <DownloadList items={filtered} onToggleFavorite={handleToggleFavorite} onDelete={handleDelete} onCopyLink={handleCopyLink} copiedId={copiedId} formatDate={formatDate} emptyMessage="سجل التحميل فارغ" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DownloadList({
  items,
  onToggleFavorite,
  onDelete,
  onCopyLink,
  copiedId,
  formatDate,
  emptyMessage,
}: {
  items: DownloadRecord[];
  onToggleFavorite: (id: string, val: boolean) => void;
  onDelete: (id: string) => void;
  onCopyLink: (id: string, url: string) => void;
  copiedId: string | null;
  formatDate: (date: string) => string;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16 text-muted-foreground"
      >
        <FolderOpen className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-sm">{emptyMessage}</p>
        <p className="text-xs mt-1 opacity-60">ابدأ بتحليل رابط وتحميل ملف</p>
      </motion.div>
    );
  }

  return (
    <ScrollArea className="max-h-[500px]">
      <div className="space-y-2 pr-1">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <DownloadCard
              key={item.id}
              item={item}
              onToggleFavorite={onToggleFavorite}
              onDelete={onDelete}
              onCopyLink={onCopyLink}
              copiedId={copiedId}
              formatDate={formatDate}
            />
          ))}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}

function DownloadCard({
  item,
  onToggleFavorite,
  onDelete,
  onCopyLink,
  copiedId,
  formatDate,
}: {
  item: DownloadRecord;
  onToggleFavorite: (id: string, val: boolean) => void;
  onDelete: (id: string) => void;
  onCopyLink: (id: string, url: string) => void;
  copiedId: string | null;
  formatDate: (date: string) => string;
}) {
  const categoryConfig =
    item.fileType !== 'unknown'
      ? FILE_CATEGORIES[item.fileType as FileCategory]
      : null;
  const Icon = CATEGORY_ICONS[item.fileType] || FileText;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="group hover:shadow-md transition-all duration-200 border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div
              className={`flex items-center justify-center w-11 h-11 rounded-lg shrink-0 ${
                categoryConfig?.bgColor || 'bg-gray-500/10'
              }`}
            >
              <Icon
                className={`w-5 h-5 ${categoryConfig?.color || 'text-gray-500'}`}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-medium truncate" dir="ltr">
                  {item.filename}
                </p>
                {item.extension && (
                  <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                    .{item.extension.toUpperCase()}
                  </Badge>
                )}
                {item.source && (
                  <Badge variant="secondary" className="text-[10px] shrink-0 gap-0.5">
                    <Globe className="w-2.5 h-2.5" />
                    {item.source}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {item.fileSize && <span>{item.fileSize}</span>}
                <span>{formatDate(item.createdAt)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onToggleFavorite(item.id, item.isFavorite)}
              >
                <Star
                  className={`w-4 h-4 ${
                    item.isFavorite
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground'
                  }`}
                />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onCopyLink(item.id, item.url)}>
                    {copiedId === item.id ? (
                      <span className="text-emerald-500">تم النسخ ✓</span>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 ml-2" />
                        نسخ الرابط
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.open(item.url, '_blank')}>
                    <ExternalLink className="w-3.5 h-3.5 ml-2" />
                    فتح في نافذة جديدة
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(item.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5 ml-2" />
                    حذف
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
