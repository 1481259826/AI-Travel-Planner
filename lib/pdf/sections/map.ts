/**
 * PDF 地图页生成
 */

import { jsPDF } from 'jspdf';
import { setPdfFont, FONT_SIZES } from '@/lib/fonts/loadPdfFonts';
import { MARGIN, CONTENT_WIDTH } from '@/lib/pdf/utils/layout';

/**
 * 添加地图页面
 */
export function addMapPage(
  doc: jsPDF,
  mapImageBase64: string,
  startY: number
): number {
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
