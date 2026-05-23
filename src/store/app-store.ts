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
  settings: {
    theme: string;
    language: string;
    autoClassify: boolean;
    showNotifications: boolean;
    defaultFolder: string;
    batchSize: number;
  };
  setSettings: (settings: Partial<AppState['settings']>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'home',
  setCurrentView: (view) => set({ currentView: view }),

  analysisResult: null,
  isAnalyzing: false,
  analysisError: null,
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setIsAnalyzing: (val) => set({ isAnalyzing: val }),
  setAnalysisError: (err) => set({ analysisError: err }),

  downloads: [],
  setDownloads: (items) => set({ downloads: items }),
  addDownload: (item) => set((state) => ({ downloads: [item, ...state.downloads] })),
  updateDownload: (id, updates) =>
    set((state) => ({
      downloads: state.downloads.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    })),
  removeDownload: (id) =>
    set((state) => ({ downloads: state.downloads.filter((d) => d.id !== id) })),

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

  settings: {
    theme: 'system',
    language: 'ar',
    autoClassify: true,
    showNotifications: true,
    defaultFolder: 'التحميلات',
    batchSize: 3,
  },
  setSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),
}));
