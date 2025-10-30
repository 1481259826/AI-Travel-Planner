/**
 * 行程导出为 PDF 核心逻辑
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Trip } from '@/types';
import { ExportOptions, PdfGenerationProgress } from '@/types/pdf';
import {
  formatCurrency,
  formatDateRange,
  formatDate,
  calculateDays,
  captureMap,
  captureChart,
  generatePdfFilename,
  getActivityTypeLabel,
  getAccommodationTypeLabel,
} from './pdfHelpers';
import { loadChineseFont, setPdfFont, FONT_SIZES } from './fonts/loadPdfFonts';

// PDF 页面配置
const PAGE_WIDTH = 210; // A4 宽度 (mm)
const PAGE_HEIGHT = 297; // A4 高度 (mm)
const MARGIN = 20; // 页边距 (mm)
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN; // 内容宽度

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

/**
 * 添加封面页
 */
function addCoverPage(doc: jsPDF, trip: Trip): number {
  let y = PAGE_HEIGHT / 3;

  // 主标题
  setPdfFont(doc, 'bold');
  doc.setFontSize(FONT_SIZES.title);
  doc.setTextColor(0, 102, 204); // 蓝色
  const title = `${trip.destination}之旅`;
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, (PAGE_WIDTH - titleWidth) / 2, y);

  // 副标题
  y += 20;
  setPdfFont(doc, 'normal');
  doc.setFontSize(FONT_SIZES.heading2);
  doc.setTextColor(100, 100, 100);
  const subtitle = formatDateRange(trip.start_date, trip.end_date);
  const subtitleWidth = doc.getTextWidth(subtitle);
  doc.text(subtitle, (PAGE_WIDTH - subtitleWidth) / 2, y);

  // 旅行信息
  y += 20;
  doc.setFontSize(FONT_SIZES.body);
  const days = calculateDays(trip.start_date, trip.end_date);
  const info = `${days}天 | ${trip.travelers}人 | 预算 ${formatCurrency(trip.budget)}`;
  const infoWidth = doc.getTextWidth(info);
  doc.text(info, (PAGE_WIDTH - infoWidth) / 2, y);

  // 分隔线
  y += 15;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(PAGE_WIDTH / 4, y, (PAGE_WIDTH * 3) / 4, y);

  // 旅行偏好
  if (trip.preferences && trip.preferences.length > 0) {
    y += 15;
    const prefs = trip.preferences.join(' · ');
    const prefsWidth = doc.getTextWidth(prefs);
    doc.setTextColor(100, 100, 100);
    doc.text(prefs, (PAGE_WIDTH - prefsWidth) / 2, y);
  }

  // 生成信息
  y = PAGE_HEIGHT - 40;
  doc.setFontSize(FONT_SIZES.small);
  doc.setTextColor(150, 150, 150);
  const generatedText = `生成日期: ${formatDate(
    new Date().toISOString(),
    'yyyy年MM月dd日'
  )}`;
  const generatedWidth = doc.getTextWidth(generatedText);
  doc.text(generatedText, (PAGE_WIDTH - generatedWidth) / 2, y);

  return y;
}

/**
 * 添加行程概览
 */
function addOverview(doc: jsPDF, trip: Trip, startY: number): number {
  let y = startY;

  // 标题
  setPdfFont(doc, 'bold');
  doc.setFontSize(FONT_SIZES.heading1);
  doc.setTextColor(0, 0, 0);
  doc.text('行程概览', MARGIN, y);

  y += 12;

  // 行程摘要
  if (trip.itinerary?.summary) {
    setPdfFont(doc, 'normal');
    doc.setFontSize(FONT_SIZES.body);
    doc.setTextColor(60, 60, 60);

    const lines = doc.splitTextToSize(trip.itinerary.summary, CONTENT_WIDTH);
    doc.text(lines, MARGIN, y);
    y += lines.length * 6 + 10;
  }

  // 基本信息表格
  const days = calculateDays(trip.start_date, trip.end_date);
  autoTable(doc, {
    startY: y,
    head: [['项目', '详情']],
    body: [
      ['目的地', trip.destination],
      ['出发地', (trip as any).origin || '未指定'],
      ['日期', formatDateRange(trip.start_date, trip.end_date)],
      ['天数', `${days} 天`],
      ['人数', `${trip.travelers} 人`],
      ['预算', formatCurrency(trip.budget)],
      [
        '预估费用',
        trip.itinerary?.estimated_cost?.total
          ? formatCurrency(trip.itinerary.estimated_cost.total)
          : '计算中',
      ],
    ],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: FONT_SIZES.body,
    },
    headStyles: {
      fillColor: [0, 102, 204],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  return (doc as any).lastAutoTable.finalY + 10;
}

/**
 * 添加住宿信息
 */
function addAccommodation(
  doc: jsPDF,
  accommodations: any[],
  startY: number
): number {
  let y = startY;

  // 标题
  setPdfFont(doc, 'bold');
  doc.setFontSize(FONT_SIZES.heading1);
  doc.setTextColor(0, 0, 0);
  doc.text('住宿信息', MARGIN, y);

  y += 10;

  // 住宿列表
  accommodations.forEach((acc, index) => {
    if (y > PAGE_HEIGHT - 60) {
      doc.addPage();
      y = MARGIN;
    }

    // 酒店名称
    setPdfFont(doc, 'bold');
    doc.setFontSize(FONT_SIZES.heading3);
    doc.setTextColor(0, 102, 204);
    doc.text(`${index + 1}. ${acc.name}`, MARGIN, y);

    y += 7;

    // 详细信息
    setPdfFont(doc, 'normal');
    doc.setFontSize(FONT_SIZES.body);
    doc.setTextColor(60, 60, 60);

    const details = [
      `类型: ${getAccommodationTypeLabel(acc.type)}`,
      `地址: ${acc.location?.address || '未指定'}`,
      `入住: ${formatDate(acc.check_in, 'MM月dd日')}`,
      `退房: ${formatDate(acc.check_out, 'MM月dd日')}`,
      `价格: ${formatCurrency(acc.price_per_night)}/晚 × ${
        calculateDays(acc.check_in, acc.check_out) - 1
      }晚 = ${formatCurrency(acc.total_price)}`,
    ];

    if (acc.rating) {
      details.push(`评分: ${acc.rating}/5`);
    }

    if (acc.amenities && acc.amenities.length > 0) {
      details.push(`设施: ${acc.amenities.join(', ')}`);
    }

    details.forEach((detail) => {
      doc.text(detail, MARGIN + 5, y);
      y += 5;
    });

    y += 5;
  });

  return y;
}

/**
 * 添加交通信息
 */
function addTransportation(
  doc: jsPDF,
  transportation: any,
  startY: number
): number {
  let y = startY;

  // 标题
  setPdfFont(doc, 'bold');
  doc.setFontSize(FONT_SIZES.heading1);
  doc.setTextColor(0, 0, 0);
  doc.text('交通信息', MARGIN, y);

  y += 10;

  // 去程
  if (transportation.to_destination) {
    setPdfFont(doc, 'bold');
    doc.setFontSize(FONT_SIZES.heading3);
    doc.setTextColor(0, 102, 204);
    doc.text('去程', MARGIN, y);
    y += 6;

    setPdfFont(doc, 'normal');
    doc.setFontSize(FONT_SIZES.body);
    doc.setTextColor(60, 60, 60);
    doc.text(
      `方式: ${transportation.to_destination.method}`,
      MARGIN + 5,
      y
    );
    y += 5;
    const toDetails = doc.splitTextToSize(
      `详情: ${transportation.to_destination.details}`,
      CONTENT_WIDTH - 5
    );
    doc.text(toDetails, MARGIN + 5, y);
    y += toDetails.length * 5;
    doc.text(
      `费用: ${formatCurrency(transportation.to_destination.cost)}`,
      MARGIN + 5,
      y
    );
    y += 10;
  }

  // 回程
  if (transportation.from_destination) {
    setPdfFont(doc, 'bold');
    doc.setFontSize(FONT_SIZES.heading3);
    doc.setTextColor(0, 102, 204);
    doc.text('回程', MARGIN, y);
    y += 6;

    setPdfFont(doc, 'normal');
    doc.setFontSize(FONT_SIZES.body);
    doc.setTextColor(60, 60, 60);
    doc.text(
      `方式: ${transportation.from_destination.method}`,
      MARGIN + 5,
      y
    );
    y += 5;
    const fromDetails = doc.splitTextToSize(
      `详情: ${transportation.from_destination.details}`,
      CONTENT_WIDTH - 5
    );
    doc.text(fromDetails, MARGIN + 5, y);
    y += fromDetails.length * 5;
    doc.text(
      `费用: ${formatCurrency(transportation.from_destination.cost)}`,
      MARGIN + 5,
      y
    );
    y += 10;
  }

  // 当地交通
  if (transportation.local) {
    setPdfFont(doc, 'bold');
    doc.setFontSize(FONT_SIZES.heading3);
    doc.setTextColor(0, 102, 204);
    doc.text('当地交通', MARGIN, y);
    y += 6;

    setPdfFont(doc, 'normal');
    doc.setFontSize(FONT_SIZES.body);
    doc.setTextColor(60, 60, 60);
    doc.text(
      `方式: ${transportation.local.methods?.join(', ') || '未指定'}`,
      MARGIN + 5,
      y
    );
    y += 5;
    doc.text(
      `预估费用: ${formatCurrency(transportation.local.estimated_cost)}`,
      MARGIN + 5,
      y
    );
    y += 10;
  }

  return y;
}

/**
 * 添加每日行程
 */
async function addDailyItinerary(
  doc: jsPDF,
  days: any[],
  startY: number,
  includeMeals: boolean
): Promise<number> {
  let y = startY;

  // 标题
  setPdfFont(doc, 'bold');
  doc.setFontSize(FONT_SIZES.heading1);
  doc.setTextColor(0, 0, 0);
  doc.text('每日行程', MARGIN, y);

  y += 10;

  for (const day of days) {
    // 检查是否需要新页面
    if (y > PAGE_HEIGHT - 80) {
      doc.addPage();
      y = MARGIN;
    }

    // 日期标题
    setPdfFont(doc, 'bold');
    doc.setFontSize(FONT_SIZES.heading2);
    doc.setTextColor(0, 102, 204);
    doc.text(
      `第${day.day}天 - ${formatDate(day.date, 'MM月dd日 (EEEE)')}`,
      MARGIN,
      y
    );

    y += 10;

    // 活动列表
    if (day.activities && day.activities.length > 0) {
      day.activities.forEach((activity: any) => {
        if (y > PAGE_HEIGHT - 40) {
          doc.addPage();
          y = MARGIN;
        }

        // 活动时间和名称
        setPdfFont(doc, 'bold');
        doc.setFontSize(FONT_SIZES.body);
        doc.setTextColor(0, 0, 0);
        doc.text(`${activity.time} - ${activity.name}`, MARGIN + 5, y);

        y += 5;

        // 活动详情
        setPdfFont(doc, 'normal');
        doc.setFontSize(FONT_SIZES.small);
        doc.setTextColor(100, 100, 100);

        const details = [
          `类型: ${getActivityTypeLabel(activity.type)}`,
          `地点: ${activity.location?.name || '未指定'}`,
          `时长: ${activity.duration}`,
        ];

        if (activity.ticket_price) {
          details.push(`门票: ${formatCurrency(activity.ticket_price)}`);
        }

        details.forEach((detail) => {
          doc.text(detail, MARGIN + 10, y);
          y += 4;
        });

        // 描述
        if (activity.description) {
          const descLines = doc.splitTextToSize(
            activity.description,
            CONTENT_WIDTH - 15
          );
          doc.text(descLines, MARGIN + 10, y);
          y += descLines.length * 4;
        }

        // 提示
        if (activity.tips) {
          doc.setTextColor(200, 100, 0);
          const tipsLines = doc.splitTextToSize(
            `💡 ${activity.tips}`,
            CONTENT_WIDTH - 15
          );
          doc.text(tipsLines, MARGIN + 10, y);
          y += tipsLines.length * 4;
        }

        y += 5;
      });
    }

    // 用餐推荐
    if (includeMeals && day.meals && day.meals.length > 0) {
      if (y > PAGE_HEIGHT - 40) {
        doc.addPage();
        y = MARGIN;
      }

      setPdfFont(doc, 'bold');
      doc.setFontSize(FONT_SIZES.heading3);
      doc.setTextColor(0, 153, 0);
      doc.text('用餐推荐', MARGIN + 5, y);

      y += 6;

      day.meals.forEach((meal: any) => {
        if (y > PAGE_HEIGHT - 30) {
          doc.addPage();
          y = MARGIN;
        }

        setPdfFont(doc, 'normal');
        doc.setFontSize(FONT_SIZES.small);
        doc.setTextColor(60, 60, 60);

        const mealInfo = `${meal.time} - ${meal.restaurant} (${meal.cuisine}) - 人均${formatCurrency(meal.avg_price)}`;
        doc.text(mealInfo, MARGIN + 10, y);
        y += 4;

        if (meal.recommended_dishes && meal.recommended_dishes.length > 0) {
          doc.setTextColor(100, 100, 100);
          doc.text(
            `推荐: ${meal.recommended_dishes.join(', ')}`,
            MARGIN + 10,
            y
          );
          y += 4;
        }

        y += 3;
      });
    }

    y += 10;
  }

  return y;
}

/**
 * 添加费用预估
 */
function addBudgetBreakdown(
  doc: jsPDF,
  cost: any,
  totalBudget: number,
  startY: number
): number {
  let y = startY;

  // 标题
  setPdfFont(doc, 'bold');
  doc.setFontSize(FONT_SIZES.heading1);
  doc.setTextColor(0, 0, 0);
  doc.text('费用预估', MARGIN, y);

  y += 10;

  // 费用明细表格
  const categories = [
    { name: '住宿', amount: cost.accommodation },
    { name: '交通', amount: cost.transportation },
    { name: '餐饮', amount: cost.food },
    { name: '景点', amount: cost.attractions },
    { name: '其他', amount: cost.other },
  ];

  autoTable(doc, {
    startY: y,
    head: [['类别', '金额', '占比']],
    body: categories.map((cat) => [
      cat.name,
      formatCurrency(cat.amount),
      `${((cat.amount / cost.total) * 100).toFixed(1)}%`,
    ]),
    foot: [['总计', formatCurrency(cost.total), '100%']],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: FONT_SIZES.body,
    },
    headStyles: {
      fillColor: [0, 102, 204],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // 预算对比
  setPdfFont(doc, 'normal');
  doc.setFontSize(FONT_SIZES.body);
  doc.setTextColor(60, 60, 60);

  const remaining = totalBudget - cost.total;
  const usagePercent = (cost.total / totalBudget) * 100;

  doc.text(`预算总额: ${formatCurrency(totalBudget)}`, MARGIN, y);
  y += 6;
  doc.text(`预估费用: ${formatCurrency(cost.total)}`, MARGIN, y);
  y += 6;

  if (remaining >= 0) {
    doc.setTextColor(0, 153, 0);
    doc.text(`剩余预算: ${formatCurrency(remaining)}`, MARGIN, y);
  } else {
    doc.setTextColor(204, 0, 0);
    doc.text(`超出预算: ${formatCurrency(Math.abs(remaining))}`, MARGIN, y);
  }

  y += 6;
  doc.setTextColor(60, 60, 60);
  doc.text(`预算使用率: ${usagePercent.toFixed(1)}%`, MARGIN, y);

  return y + 10;
}

/**
 * 添加地图页面
 */
function addMapPage(doc: jsPDF, mapImageBase64: string, startY: number): number {
  let y = startY;

  // 标题
  setPdfFont(doc, 'bold');
  doc.setFontSize(FONT_SIZES.heading1);
  doc.setTextColor(0, 0, 0);
  doc.text('行程地图', MARGIN, y);

  y += 10;

  // 插入地图图片
  const imgWidth = CONTENT_WIDTH;
  const imgHeight = (imgWidth * 3) / 4; // 4:3 比例

  doc.addImage(mapImageBase64, 'PNG', MARGIN, y, imgWidth, imgHeight);

  return y + imgHeight + 10;
}

/**
 * 添加图表页面
 */
function addChartPage(
  doc: jsPDF,
  chartImageBase64: string,
  startY: number
): number {
  let y = startY;

  // 标题
  setPdfFont(doc, 'bold');
  doc.setFontSize(FONT_SIZES.heading1);
  doc.setTextColor(0, 0, 0);
  doc.text('费用分布', MARGIN, y);

  y += 10;

  // 插入图表图片
  const imgWidth = CONTENT_WIDTH;
  const imgHeight = imgWidth * 0.6; // 5:3 比例

  doc.addImage(chartImageBase64, 'PNG', MARGIN, y, imgWidth, imgHeight);

  return y + imgHeight + 10;
}

/**
 * 添加页脚
 */
function addPageFooter(doc: jsPDF, pageNumber: number): void {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  // 页码
  setPdfFont(doc, 'normal');
  doc.setFontSize(FONT_SIZES.footer);
  doc.setTextColor(150, 150, 150);
  const pageText = `第 ${pageNumber} 页`;
  const pageTextWidth = doc.getTextWidth(pageText);
  doc.text(pageText, pageWidth - MARGIN - pageTextWidth, pageHeight - 10);

  // 品牌标识
  const brandText = '由 AI Travel Planner 生成';
  doc.text(brandText, MARGIN, pageHeight - 10);
}
