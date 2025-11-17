/**
 * PDF 页脚生成工具
 */

import { jsPDF } from 'jspdf'
import { setPdfFont, FONT_SIZES } from '@/lib/fonts/loadPdfFonts'
import { MARGIN } from './layout'

/**
 * 添加页脚（页码和品牌标识）
 */
export function addPageFooter(doc: jsPDF, pageNumber: number): void {
  const pageHeight = doc.internal.pageSize.getHeight()
  const pageWidth = doc.internal.pageSize.getWidth()

  // 页码
  setPdfFont(doc, 'normal')
  doc.setFontSize(FONT_SIZES.footer)
  doc.setTextColor(150, 150, 150)
  const pageText = `第 ${pageNumber} 页`
  const pageTextWidth = doc.getTextWidth(pageText)
  doc.text(pageText, pageWidth - MARGIN - pageTextWidth, pageHeight - 10)

  // 品牌标识
  const brandText = '由 AI Travel Planner 生成'
  doc.text(brandText, MARGIN, pageHeight - 10)
}
