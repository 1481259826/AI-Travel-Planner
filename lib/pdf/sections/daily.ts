/**
 * PDF 每日行程页生成
 */

import { jsPDF } from 'jspdf';
import {
  formatDate,
  formatCurrency,
  getActivityTypeLabel,
} from '@/lib/pdf/helpers';
import { setPdfFont, FONT_SIZES } from '@/lib/fonts/loadPdfFonts';
import { MARGIN, PAGE_HEIGHT, CONTENT_WIDTH } from '@/lib/pdf/utils/layout';

/**
 * 添加每日行程
 */
export async function addDailyItinerary(
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
