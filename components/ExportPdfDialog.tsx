'use client';

import React, { useState } from 'react';
import { Trip } from '@/types';
import { ExportOptions, PdfGenerationProgress } from '@/types/pdf';
import { exportTripToPDF } from '@/lib/exportTripToPDF';
import { generatePdfFilename, downloadFile, openPdfInNewWindow, isMobileDevice } from '@/lib/pdfHelpers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Eye, Download, Printer } from 'lucide-react';

interface ExportPdfDialogProps {
  trip: Trip;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportPdfDialog({ trip, open, onOpenChange }: ExportPdfDialogProps) {
  // 导出选项状态
  const [options, setOptions] = useState<ExportOptions>({
    includeMap: true,
    includeCharts: true,
    sections: {
      overview: true,
      accommodation: true,
      transportation: true,
      dailyItinerary: true,
      meals: true,
      budget: true,
    },
  });

  // 生成状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<PdfGenerationProgress>({
    step: '',
    progress: 0,
    completed: false,
  });

  // 预览状态
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // 更新选项
  const updateOption = (key: keyof ExportOptions, value: boolean) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const updateSection = (key: keyof ExportOptions['sections'], value: boolean) => {
    setOptions((prev) => ({
      ...prev,
      sections: { ...prev.sections, [key]: value },
    }));
  };

  // 生成 PDF
  const generatePdf = async (preview: boolean = false) => {
    setIsGenerating(true);
    setProgress({
      step: '开始生成...',
      progress: 0,
      completed: false,
    });

    try {
      const blob = await exportTripToPDF(trip, options, setProgress);
      setPdfBlob(blob);

      if (preview) {
        // 预览模式
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setShowPreview(true);
      } else {
        // 直接下载
        const filename = generatePdfFilename(trip.destination, trip.start_date);
        downloadFile(blob, filename);
        onOpenChange(false);
      }
    } catch (error) {
      console.error('PDF 生成失败:', error);
      setProgress({
        step: '生成失败',
        progress: 0,
        completed: false,
        error: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // 下载已生成的 PDF
  const downloadGeneratedPdf = () => {
    if (pdfBlob) {
      const filename = generatePdfFilename(trip.destination, trip.start_date);
      downloadFile(pdfBlob, filename);
      onOpenChange(false);
    }
  };

  // 在新窗口打开 PDF（移动端）
  const openPdfInNew = () => {
    if (pdfBlob) {
      openPdfInNewWindow(pdfBlob);
      onOpenChange(false);
    }
  };

  // 打开打印优化版（完美支持中文）
  const openPrintVersion = () => {
    const printUrl = `/dashboard/trips/${trip.id}/print`;
    window.open(printUrl, '_blank');
    onOpenChange(false);
  };

  // 清理资源
  React.useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // 重置状态
  const handleClose = () => {
    if (!isGenerating) {
      setShowPreview(false);
      setPdfBlob(null);
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      setProgress({
        step: '',
        progress: 0,
        completed: false,
      });
      onOpenChange(false);
    }
  };

  // 如果正在显示预览
  if (showPreview && pdfUrl) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>PDF 预览</DialogTitle>
            <DialogDescription>
              预览生成的旅行计划文档
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <div className="w-full h-[60vh] border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              <iframe
                src={pdfUrl}
                className="w-full h-full"
                title="PDF Preview"
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPreview(false)}
            >
              返回
            </Button>
            {isMobileDevice() ? (
              <Button onClick={openPdfInNew}>
                <Eye className="w-4 h-4 mr-2" />
                在新窗口打开
              </Button>
            ) : (
              <Button onClick={downloadGeneratedPdf}>
                <Download className="w-4 h-4 mr-2" />
                下载 PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // 导出选项界面
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>导出为 PDF</DialogTitle>
          <DialogDescription>
            选择要包含在 PDF 中的内容，然后预览或直接下载
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-6">
            {/* 推荐提示 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Printer className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    💡 推荐使用打印优化版
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    打印优化版完美支持中文显示，通过浏览器打印功能（Ctrl/Cmd+P）保存为 PDF，格式清晰、内容完整。
                    直接下载的 PDF 因字体限制，中文显示可能不完整。
                  </p>
                </div>
              </div>
            </div>

            {/* 基本选项 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                附加内容
              </h3>
              <div className="space-y-3">
                <Checkbox
                  id="include-map"
                  checked={options.includeMap}
                  onCheckedChange={(checked) => updateOption('includeMap', checked)}
                  label="包含地图"
                  description="在 PDF 中显示行程路线地图（需要在线）"
                />
                <Checkbox
                  id="include-charts"
                  checked={options.includeCharts}
                  onCheckedChange={(checked) => updateOption('includeCharts', checked)}
                  label="包含费用图表"
                  description="在 PDF 中显示费用分布图表"
                />
              </div>
            </div>

            {/* 章节选项 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                包含的章节
              </h3>
              <div className="space-y-3">
                <Checkbox
                  id="section-overview"
                  checked={options.sections.overview}
                  onCheckedChange={(checked) => updateSection('overview', checked)}
                  label="行程概览"
                  description="基本信息和行程摘要"
                />
                <Checkbox
                  id="section-accommodation"
                  checked={options.sections.accommodation}
                  onCheckedChange={(checked) => updateSection('accommodation', checked)}
                  label="住宿信息"
                  description="酒店详情和价格"
                />
                <Checkbox
                  id="section-transportation"
                  checked={options.sections.transportation}
                  onCheckedChange={(checked) => updateSection('transportation', checked)}
                  label="交通信息"
                  description="往返和当地交通"
                />
                <Checkbox
                  id="section-daily"
                  checked={options.sections.dailyItinerary}
                  onCheckedChange={(checked) => updateSection('dailyItinerary', checked)}
                  label="每日行程"
                  description="详细的每日活动安排"
                />
                <Checkbox
                  id="section-meals"
                  checked={options.sections.meals}
                  onCheckedChange={(checked) => updateSection('meals', checked)}
                  label="餐饮推荐"
                  description="包含在每日行程中的用餐建议"
                  disabled={!options.sections.dailyItinerary}
                />
                <Checkbox
                  id="section-budget"
                  checked={options.sections.budget}
                  onCheckedChange={(checked) => updateSection('budget', checked)}
                  label="费用预估"
                  description="详细的预算和费用分解"
                />
              </div>
            </div>

            {/* 生成进度 */}
            {isGenerating && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {progress.step}
                    </p>
                    <div className="mt-2 w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                      <div
                        className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
                {progress.error && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    错误: {progress.error}
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isGenerating}
          >
            取消
          </Button>
          <Button
            onClick={openPrintVersion}
            disabled={isGenerating}
          >
            <Printer className="w-4 h-4 mr-2" />
            打印优化版（推荐）
          </Button>
          <Button
            variant="outline"
            onClick={() => generatePdf(true)}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                预览
              </>
            )}
          </Button>
          <Button
            onClick={() => generatePdf(false)}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                直接下载
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
