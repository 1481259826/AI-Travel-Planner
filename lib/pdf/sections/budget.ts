/**
 * PDF 费用预估页生成
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '@/lib/pdf/helpers';
import { setPdfFont, FONT_SIZES } from '@/lib/fonts/loadPdfFonts';
import { MARGIN } from '@/lib/pdf/utils/layout';

/**
 * 添加费用预估
 */
export function addBudgetBreakdown(
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
