import { create } from 'zustand';
import type { AnalysisResult } from '@/lib/file-utils';

export type AppView = 'home' | 'history' | 'favorites' | 'settings';

export interface DownloadRecord {
  id: string;
  url: string;
  filename: string;
  originalFilename: string;
  fileType: string;
  extension: string;
  fileSize: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  category: string;
  isFavorite: boolean;
  status: string;
  thumbnailUrl: string | null;
  source: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEYS = {
  downloads: 'hammel-downloads',
  settings: 'hammel-settings',
} as const;

const DEFAULT_SETTINGS = {
  theme: 'system',
  language: 'ar',
  autoClassify: true,
  showNotifications: true,
  defaultFolder: 'التحميلات',
  batchSize: 3,
};

// Safe localStorage access (SSR-safe)
function getFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable
  }
}

interface AppState {
  // Current view
  currentView: AppView;
  setCurrentView: (view: AppView) => void;

  // URL analysis
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  analysisError: string | null;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setIsAnalyzing: (val: boolean) => void;
  setAnalysisError: (err: string | null) => void;

  // Downloads
  downloads: DownloadRecord[];
  setDownloads: (items: DownloadRecord[]) => void;
  addDownload: (item: DownloadRecord) => void;
  updateDownload: (id: string, updates: Partial<DownloadRecord>) => void;
  removeDownload: (id: string) => void;

  // Filter
  activeFilter: string;
  setActiveFilter: (filter: string) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Download progress
  downloadProgress: number;
  isDownloading: boolean;
  setDownloadProgress: (progress: number) => void;
  setIsDownloading: (val: boolean) => void;

  // Batch URLs
  batchUrls: string[];
  setBatchUrls: (urls: string[]) => void;

  // Settings
  settings: typeof DEFAULT_SETTINGS;
  setSettings: (settings: Partial<typeof DEFAULT_SETTINGS>) => void;

  // Hydration
  hydrate: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'home',
  setCurrentView: (view) => set({ currentView: view }),

  analysisResult: null,
  isAnalyzing: false,
  analysisError: null,
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setIsAnalyzing: (val) => set({ isAnalyzing: val }),
  setAnalysisError: (err) => set({ analysisError: err }),

  downloads: [],
  setDownloads: (items) => {
    set({ downloads: items });
    setToStorage(STORAGE_KEYS.downloads, items);
  },
  addDownload: (item) => {
    const updated = [item, ...get().downloads];
    set({ downloads: updated });
    setToStorage(STORAGE_KEYS.downloads, updated);
  },
  updateDownload: (id, updates) => {
    const updated = get().downloads.map((d) =>
      d.id === id ? { ...d, ...updates } : d
    );
    set({ downloads: updated });
    setToStorage(STORAGE_KEYS.downloads, updated);
  },
  removeDownload: (id) => {
    const updated = get().downloads.filter((d) => d.id !== id);
    set({ downloads: updated });
    setToStorage(STORAGE_KEYS.downloads, updated);
  },

  activeFilter: 'all',
  setActiveFilter: (filter) => set({ activeFilter: filter }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  downloadProgress: 0,
  isDownloading: false,
  setDownloadProgress: (progress) => set({ downloadProgress: progress }),
  setIsDownloading: (val) => set({ isDownloading: val }),

  batchUrls: [],
  setBatchUrls: (urls) => set({ batchUrls: urls }),

  settings: { ...DEFAULT_SETTINGS },
  setSettings: (newSettings) => {
    const updated = { ...get().settings, ...newSettings };
    set({ settings: updated });
    setToStorage(STORAGE_KEYS.settings, updated);
  },

  // Hydrate from localStorage on mount
  hydrate: () => {
    const downloads = getFromStorage<DownloadRecord[]>(STORAGE_KEYS.downloads, []);
    const settings = getFromStorage<typeof DEFAULT_SETTINGS>(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
    set({ downloads, settings });
  },
}));
