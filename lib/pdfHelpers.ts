/**
 * PDF 生成辅助工具函数
 */

import html2canvas from 'html2canvas';
import { format, differenceInDays } from 'date-fns';

/**
 * 格式化货币
 *
 * @param amount - 金额
 * @param currency - 货币符号
 * @returns 格式化后的字符串
 */
export function formatCurrency(amount: number, currency = '¥'): string {
  return `${currency}${amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * 计算旅行天数
 *
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 天数
 */
export function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return differenceInDays(end, start) + 1;
}

/**
 * 格式化日期
 *
 * @param date - 日期字符串
 * @param formatStr - 格式字符串
 * @returns 格式化后的日期
 */
export function formatDate(date: string, formatStr = 'yyyy-MM-dd'): string {
  return format(new Date(date), formatStr);
}

/**
 * 格式化日期范围
 *
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @returns 格式化后的日期范围字符串
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = formatDate(startDate, 'yyyy年MM月dd日');
  const end = formatDate(endDate, 'yyyy年MM月dd日');
  const days = calculateDays(startDate, endDate);

  return `${start} - ${end} (${days}天)`;
}

/**
 * 截取 DOM 元素为图片
 *
 * @param element - DOM 元素或选择器
 * @param options - html2canvas 选项
 * @returns Promise<string> - Base64 图片数据
 */
export async function captureElement(
  element: HTMLElement | string,
  options?: {
    width?: number;
    height?: number;
    scale?: number;
    backgroundColor?: string;
  }
): Promise<string> {
  const el =
    typeof element === 'string'
      ? document.querySelector<HTMLElement>(element)
      : element;

  if (!el) {
    throw new Error('Element not found');
  }

  try {
    const canvas = await html2canvas(el, {
      scale: options?.scale || 2, // 提高清晰度
      useCORS: true,
      allowTaint: true,
      backgroundColor: options?.backgroundColor || '#ffffff',
      width: options?.width,
      height: options?.height,
      logging: false,
    });

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('截图失败:', error);
    throw new Error('Failed to capture element');
  }
}

/**
 * 截取地图为图片
 *
 * @param mapContainerId - 地图容器 ID
 * @returns Promise<string> - Base64 图片数据
 */
export async function captureMap(
  mapContainerId: string = 'amap-container'
): Promise<string> {
  try {
    const mapElement = document.getElementById(mapContainerId);
    if (!mapElement) {
      throw new Error('Map container not found');
    }

    // 等待地图完全加载
    await new Promise((resolve) => setTimeout(resolve, 500));

    return await captureElement(mapElement, {
      backgroundColor: '#f0f0f0',
      scale: 2,
    });
  } catch (error) {
    console.error('地图截图失败:', error);
    throw error;
  }
}

/**
 * 截取图表为图片
 *
 * @param chartElementId - 图表元素 ID 或选择器
 * @returns Promise<string> - Base64 图片数据
 */
export async function captureChart(
  chartElementId: string
): Promise<string> {
  try {
    const chartElement = document.getElementById(chartElementId);
    if (!chartElement) {
      throw new Error('Chart element not found');
    }

    // 等待图表完全渲染
    await new Promise((resolve) => setTimeout(resolve, 300));

    return await captureElement(chartElement, {
      backgroundColor: '#ffffff',
      scale: 2,
    });
  } catch (error) {
    console.error('图表截图失败:', error);
    throw error;
  }
}

/**
 * 检测是否为移动设备
 *
 * @returns boolean
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * 将 Base64 图片数据转换为 Blob
 *
 * @param base64 - Base64 字符串
 * @returns Blob
 */
export function base64ToBlob(base64: string): Blob {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

/**
 * 下载文件
 *
 * @param blob - Blob 数据
 * @param filename - 文件名
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 在新窗口中打开 PDF（用于移动端）
 *
 * @param blob - PDF Blob 数据
 */
export function openPdfInNewWindow(blob: Blob): void {
  const url = URL.createObjectURL(blob);

  if (isMobileDevice()) {
    // 移动端：在新标签页打开
    window.open(url, '_blank');
  } else {
    // 桌面端：在新窗口打开
    const newWindow = window.open(url, '_blank');
    if (newWindow) {
      newWindow.focus();
    }
  }

  // 延迟释放 URL（给浏览器时间打开）
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60000);
}

/**
 * 生成 PDF 文件名
 *
 * @param destination - 目的地
 * @param startDate - 开始日期
 * @returns 文件名
 */
export function generatePdfFilename(
  destination: string,
  startDate: string
): string {
  const date = formatDate(startDate, 'yyyyMMdd');
  const timestamp = Date.now();

  return `旅行计划-${destination}-${date}-${timestamp}.pdf`;
}

/**
 * 文本换行处理（用于 PDF）
 *
 * @param text - 原始文本
 * @param maxWidth - 最大宽度（字符数）
 * @returns 换行后的文本数组
 */
export function wrapText(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let currentLine = '';

  for (const char of text) {
    if (currentLine.length >= maxWidth && char === ' ') {
      lines.push(currentLine.trim());
      currentLine = '';
    } else {
      currentLine += char;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines;
}

/**
 * 获取活动类型的中文名称
 */
export function getActivityTypeLabel(
  type: string
): string {
  const labels: Record<string, string> = {
    attraction: '景点游览',
    shopping: '购物',
    entertainment: '娱乐',
    relaxation: '休闲',
  };

  return labels[type] || type;
}

/**
 * 获取住宿类型的中文名称
 */
export function getAccommodationTypeLabel(
  type: string
): string {
  const labels: Record<string, string> = {
    hotel: '酒店',
    hostel: '青年旅社',
    apartment: '公寓',
    resort: '度假村',
  };

  return labels[type] || type;
}
