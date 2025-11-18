'use client';

import React, { useState } from 'react';
import { Trip } from '@/types';
import { ExportOptions, PdfGenerationProgress } from '@/types/pdf';
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
import { Loader2, Printer } from 'lucide-react';

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


  // 打开打印优化版（完美支持中文）
  const openPrintVersion = () => {
    const printUrl = `/dashboard/trips/${trip.id}/print`;
    window.open(printUrl, '_blank');
    onOpenChange(false);
  };

  // 重置状态
  const handleClose = () => {
    if (!isGenerating) {
      setProgress({
        step: '',
        progress: 0,
        completed: false,
      });
      onOpenChange(false);
    }
  };

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
            {/* 提示信息 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Printer className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    💡 打印为 PDF
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    点击&ldquo;打印&rdquo;按钮将在新窗口打开打印页面，通过浏览器打印功能（Ctrl/Cmd+P）保存为 PDF，格式清晰、内容完整，完美支持中文显示。
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
            打印
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
