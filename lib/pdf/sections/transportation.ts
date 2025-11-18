/**
 * PDF 交通信息页生成
 */

import { jsPDF } from 'jspdf';
import { formatCurrency } from '@/lib/pdf/helpers';
import { setPdfFont, FONT_SIZES } from '@/lib/fonts/loadPdfFonts';
import { MARGIN, CONTENT_WIDTH } from '@/lib/pdf/utils/layout';

/**
 * 添加交通信息
 */
export function addTransportation(
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
