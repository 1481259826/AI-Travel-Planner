/**
 * 行程导出为 PDF 核心逻辑
 */

import { jsPDF } from 'jspdf';
import { Trip } from '@/types';
import { ExportOptions, PdfGenerationProgress } from '@/types/pdf';
import {
  captureMap,
  captureChart,
} from './pdf/helpers';
import { loadChineseFont } from './fonts/loadPdfFonts';
import { PAGE_WIDTH, PAGE_HEIGHT, MARGIN } from '@/lib/pdf/utils/layout';
import { addCoverPage } from '@/lib/pdf/sections/cover';
import { addOverview } from '@/lib/pdf/sections/overview';
import { addAccommodation } from '@/lib/pdf/sections/accommodation';
import { addTransportation } from '@/lib/pdf/sections/transportation';
import { addDailyItinerary } from '@/lib/pdf/sections/daily';
import { addBudgetBreakdown } from '@/lib/pdf/sections/budget';
import { addMapPage } from '@/lib/pdf/sections/map';
import { addChartPage } from '@/lib/pdf/sections/chart';
import { addPageFooter } from '@/lib/pdf/utils/footer';

/**
 * 导出行程为 PDF
 *
 * @param trip - 行程数据
 * @param options - 导出选项
 * @param onProgress - 进度回调
 * @returns Promise<Blob> - PDF Blob 数据
 */
export async function exportTripToPDF(
  trip: Trip,
  options: ExportOptions,
  onProgress?: (progress: PdfGenerationProgress) => void
): Promise<Blob> {
  try {
    // 创建 PDF 文档
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // 加载中文字体
    onProgress?.({
      step: '加载字体...',
      progress: 5,
      completed: false,
    });
    await loadChineseFont(doc);

    let currentY = MARGIN; // 当前 Y 坐标
    let pageNumber = 1;

    // 1. 封面页
    onProgress?.({
      step: '生成封面...',
      progress: 10,
      completed: false,
    });
    currentY = addCoverPage(doc, trip);
    addPageFooter(doc, pageNumber++);

    // 2. 行程概览
    if (options.sections.overview) {
      onProgress?.({
        step: '生成行程概览...',
        progress: 20,
        completed: false,
      });
      doc.addPage();
      currentY = MARGIN;
      currentY = addOverview(doc, trip, currentY);
      addPageFooter(doc, pageNumber++);
    }

    // 3. 住宿信息
    if (options.sections.accommodation && trip.itinerary?.accommodation) {
      onProgress?.({
        step: '生成住宿信息...',
        progress: 30,
        completed: false,
      });
      doc.addPage();
      currentY = MARGIN;
      currentY = addAccommodation(doc, trip.itinerary.accommodation, currentY);
      addPageFooter(doc, pageNumber++);
    }

    // 4. 交通信息
    if (options.sections.transportation && trip.itinerary?.transportation) {
      onProgress?.({
        step: '生成交通信息...',
        progress: 40,
        completed: false,
      });
      if (currentY > PAGE_HEIGHT - 80) {
        doc.addPage();
        currentY = MARGIN;
        pageNumber++;
      }
      currentY = addTransportation(
        doc,
        trip.itinerary.transportation,
        currentY
      );
      addPageFooter(doc, pageNumber);
    }

    // 5. 每日行程
    if (options.sections.dailyItinerary && trip.itinerary?.days) {
      onProgress?.({
        step: '生成每日行程...',
        progress: 50,
        completed: false,
      });
      doc.addPage();
      currentY = MARGIN;
      pageNumber++;
      currentY = await addDailyItinerary(
        doc,
        trip.itinerary.days,
        currentY,
        options.sections.meals
      );
      addPageFooter(doc, pageNumber);

      // 每日行程可能跨多页
      const totalPages = doc.getNumberOfPages();
      for (let i = pageNumber + 1; i <= totalPages; i++) {
        doc.setPage(i);
        addPageFooter(doc, i);
        pageNumber = i;
      }
    }

    // 6. 费用预估
    if (options.sections.budget && trip.itinerary?.estimated_cost) {
      onProgress?.({
        step: '生成费用预估...',
        progress: 70,
        completed: false,
      });
      doc.addPage();
      currentY = MARGIN;
      pageNumber++;
      currentY = addBudgetBreakdown(
        doc,
        trip.itinerary.estimated_cost,
        trip.budget,
        currentY
      );
      addPageFooter(doc, pageNumber);
    }

    // 7. 地图（如果选择）
    if (options.includeMap) {
      onProgress?.({
        step: '生成地图...',
        progress: 80,
        completed: false,
      });
      try {
        const mapImage = await captureMap();
        doc.addPage();
        currentY = MARGIN;
        pageNumber++;
        currentY = addMapPage(doc, mapImage, currentY);
        addPageFooter(doc, pageNumber);
      } catch (error) {
        console.log('跳过地图：地图未显示或不可用');
        // 继续，不中断整个导出过程
      }
    }

    // 8. 费用图表（如果选择）
    if (options.includeCharts && trip.itinerary?.estimated_cost) {
      onProgress?.({
        step: '生成图表...',
        progress: 90,
        completed: false,
      });
      try {
        const chartImage = await captureChart('budget-chart');
        if (currentY > PAGE_HEIGHT - 150) {
          doc.addPage();
          currentY = MARGIN;
          pageNumber++;
        }
        currentY = addChartPage(doc, chartImage, currentY);
        addPageFooter(doc, pageNumber);
      } catch (error) {
        console.log('跳过图表：图表未显示或不可用');
        // 继续，不中断整个导出过程
      }
    }

    onProgress?.({
      step: '完成',
      progress: 100,
      completed: true,
    });

    // 转换为 Blob
    const pdfBlob = doc.output('blob');
    return pdfBlob;
  } catch (error) {
    console.error('PDF 生成失败:', error);
    throw error;
  }
}

