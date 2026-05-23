'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  Monitor,
  Languages,
  FolderOpen,
  Bell,
  Zap,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/store/app-store';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, setSettings } = useAppStore();

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

  // Fetch settings from server on open
  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open, fetchSettings]);

  const saveSettings = useCallback(
    async (updates: Partial<typeof settings>) => {
      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (res.ok) {
          setSettings(updates);
        }
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    },
    [setSettings]
  );

  const themeOptions = [
    { key: 'light', label: 'فاتح', icon: Sun },
    { key: 'dark', label: 'داكن', icon: Moon },
    { key: 'system', label: 'تلقائي', icon: Monitor },
  ];

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => onOpenChange(false)}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 top-[5%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-lg z-50 max-h-[90vh] overflow-y-auto"
          >
            <Card className="border-2 shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <SettingsIcon className="w-5 h-5" />
                  الإعدادات
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Theme */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Sun className="w-4 h-4" />
                    المظهر
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {themeOptions.map((opt) => {
                      const Icon = opt.icon;
                      const isActive = settings.theme === opt.key;
                      return (
                        <Button
                          key={opt.key}
                          variant={isActive ? 'default' : 'outline'}
                          className="gap-2 h-12"
                          onClick={() => saveSettings({ theme: opt.key })}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-xs">{opt.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Language */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Languages className="w-4 h-4" />
                    اللغة
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={settings.language === 'ar' ? 'default' : 'outline'}
                      className="h-11 text-sm"
                      onClick={() => saveSettings({ language: 'ar' })}
                    >
                      🇸🇦 العربية
                    </Button>
                    <Button
                      variant={settings.language === 'en' ? 'default' : 'outline'}
                      className="h-11 text-sm"
                      onClick={() => saveSettings({ language: 'en' })}
                    >
                      🇺🇸 English
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Download behavior */}
                <div className="space-y-4">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Zap className="w-4 h-4" />
                    سلوك التحميل
                  </Label>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">تصنيف تلقائي</p>
                        <p className="text-xs text-muted-foreground">
                          تصنيف الملفات تلقائيًا حسب النوع
                        </p>
                      </div>
                      <Switch
                        checked={settings.autoClassify}
                        onCheckedChange={(val) => saveSettings({ autoClassify: val })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">الإشعارات</p>
                        <p className="text-xs text-muted-foreground">
                          عرض إشعارات عند اكتمال التحميل
                        </p>
                      </div>
                      <Switch
                        checked={settings.showNotifications}
                        onCheckedChange={(val) =>
                          saveSettings({ showNotifications: val })
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Default folder */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <FolderOpen className="w-4 h-4" />
                    مجلد التحميل الافتراضي
                  </Label>
                  <Input
                    value={settings.defaultFolder}
                    onChange={(e) =>
                      saveSettings({ defaultFolder: e.target.value })
                    }
                    placeholder="التحميلات"
                    className="h-11"
                  />
                </div>

                <Separator />

                {/* Batch size */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Bell className="w-4 h-4" />
                    حد التحميل الجماعي
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={settings.batchSize}
                      onChange={(e) =>
                        saveSettings({ batchSize: parseInt(e.target.value) || 3 })
                      }
                      className="w-20 h-11 text-center"
                    />
                    <span className="text-xs text-muted-foreground">
                      ملفات في نفس الوقت
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
