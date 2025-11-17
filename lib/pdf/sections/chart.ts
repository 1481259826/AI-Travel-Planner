/**
 * PDF 图表页生成
 */

import { jsPDF } from 'jspdf';
import { setPdfFont, FONT_SIZES } from '@/lib/fonts/loadPdfFonts';
import { MARGIN, CONTENT_WIDTH } from '@/lib/pdf/utils/layout';

/**
 * 添加图表页面
 */
export function addChartPage(
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
