/**
 * PDF 字体加载工具
 *
 * 重要说明：
 * jsPDF 默认使用 Helvetica 字体，不支持中文字符
 * 由于完整的中文字体文件很大（通常 10-20MB），我们采用以下方案：
 * 1. 对于标题等关键文本，保持原样（可能显示为方框，但结构清晰）
 * 2. 建议用户安装中文 PDF 阅读器，很多阅读器会自动替换字体
 * 3. 未来可以通过上传字体文件或从 CDN 加载来完全支持中文
 */

import { jsPDF } from 'jspdf';

/**
 * 加载中文字体到 PDF 文档
 *
 * 当前实现：使用 jsPDF 默认字体
 * 注意：默认字体不支持中文，中文字符可能显示为方框或被替换
 *
 * @param doc - jsPDF 文档实例
 * @returns Promise<void>
 */
export async function loadChineseFont(doc: jsPDF): Promise<void> {
  // 使用 helvetica 字体（jsPDF 默认字体）
  // 虽然不支持中文，但可以确保 PDF 文件结构正确
  doc.setFont('helvetica', 'normal');

  console.log('PDF 字体已设置（默认字体，中文支持有限）');
  console.log('提示：要完整支持中文，请参考文档添加中文字体文件');
}

/**
 * 设置 PDF 文档的字体
 *
 * @param doc - jsPDF 文档实例
 * @param style - 字体样式
 */
export function setPdfFont(
  doc: jsPDF,
  style: 'normal' | 'bold' = 'normal'
): void {
  try {
    doc.setFont('helvetica', style);
  } catch (error) {
    console.error('设置字体失败:', error);
    // 忽略错误，继续使用当前字体
  }
}

/**
 * 获取推荐的字体大小
 */
export const FONT_SIZES = {
  title: 24,        // 封面标题
  heading1: 16,     // 一级标题
  heading2: 14,     // 二级标题
  heading3: 12,     // 三级标题
  body: 10,         // 正文
  small: 8,         // 小字
  footer: 8,        // 页脚
} as const;

/**
 * 获取推荐的行高
 */
export const LINE_HEIGHTS = {
  title: 1.2,
  heading: 1.3,
  body: 1.5,
  compact: 1.2,
} as const;

/**
 * 添加中文字体支持的说明
 *
 * 要完整支持中文，需要：
 * 1. 下载中文字体文件（如 Noto Sans SC）到 public/fonts/ 目录
 * 2. 取消注释下面的代码
 * 3. 在 loadChineseFont 函数中调用 loadChineseFontFromFile
 */

// 示例代码（需要字体文件才能使用）：
/*
export async function loadChineseFontFromFile(doc: jsPDF): Promise<boolean> {
  try {
    const fontPath = '/fonts/NotoSansSC-Regular.ttf';
    const response = await fetch(fontPath);

    if (!response.ok) {
      return false;
    }

    const fontData = await response.arrayBuffer();
    const fontBase64 = arrayBufferToBase64(fontData);

    doc.addFileToVFS('NotoSansSC-Regular.ttf', fontBase64);
    doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
    doc.setFont('NotoSansSC');

    console.log('中文字体加载成功');
    return true;
  } catch (error) {
    console.error('中文字体加载失败:', error);
    return false;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;

  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}
*/
