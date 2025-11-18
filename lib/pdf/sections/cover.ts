/**
 * PDF 封面页生成
 */

import { jsPDF } from 'jspdf';
import { Trip } from '@/types';
import {
  formatCurrency,
  formatDateRange,
  formatDate,
  calculateDays,
} from '@/lib/pdf/helpers';
import { setPdfFont, FONT_SIZES } from '@/lib/fonts/loadPdfFonts';
import { PAGE_WIDTH, PAGE_HEIGHT, MARGIN } from '@/lib/pdf/utils/layout';

/**
 * 添加封面页
 */
export function addCoverPage(doc: jsPDF, trip: Trip): number {
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
