'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[200px] p-6">
          <Card className="max-w-md w-full border-destructive/30">
            <CardContent className="p-6 text-center space-y-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mx-auto">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1">حدث خطأ غير متوقع</h3>
                <p className="text-xs text-muted-foreground">
                  {this.state.error?.message || 'حدث خطأ أثناء عرض المحتوى'}
                </p>
              </div>
              <Button
                onClick={this.handleRetry}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                إعادة المحاولة
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
