/**
 * PDF 行程概览页生成
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Trip } from '@/types';
import {
  formatDateRange,
  calculateDays,
  formatCurrency,
} from '@/lib/pdfHelpers';
import { setPdfFont, FONT_SIZES } from '@/lib/fonts/loadPdfFonts';
import { MARGIN, CONTENT_WIDTH } from '@/lib/pdf/utils/layout';

/**
 * 添加行程概览
 */
export function addOverview(doc: jsPDF, trip: Trip, startY: number): number {
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
