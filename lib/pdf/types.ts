/**
 * PDF 模块类型定义
 *
 * 重新导出 types/pdf.ts 中的类型，方便 PDF 模块内部使用
 */

export type {
  ExportOptions,
  PdfGenerationProgress,
  PdfFont,
} from '@/types/pdf';

/**
 * PDF 核心配置
 */
export interface PdfConfig {
  /** 页面方向 */
  orientation: 'portrait' | 'landscape';
  /** 单位 */
  unit: 'mm' | 'pt' | 'in';
  /** 页面格式 */
  format: 'a4' | 'letter';
}

/**
 * PDF 页面信息
 */
export interface PdfPageInfo {
  /** 当前页码 */
  currentPage: number;
  /** 总页数 */
  totalPages: number;
  /** 当前 Y 坐标 */
  currentY: number;
}
