/**
 * PDF 住宿信息页生成
 */

import { jsPDF } from 'jspdf';
import {
  formatDate,
  calculateDays,
  formatCurrency,
  getAccommodationTypeLabel,
} from '@/lib/pdf/helpers';
import { setPdfFont, FONT_SIZES } from '@/lib/fonts/loadPdfFonts';
import { MARGIN, PAGE_HEIGHT } from '@/lib/pdf/utils/layout';

/**
 * 添加住宿信息
 */
export function addAccommodation(
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
