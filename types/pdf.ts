/**
 * PDF 导出相关的类型定义
 */

export interface ExportOptions {
  /** 是否包含地图 */
  includeMap: boolean;

  /** 是否包含费用图表 */
  includeCharts: boolean;

  /** 要包含的章节 */
  sections: {
    /** 行程概览 */
    overview: boolean;
    /** 住宿信息 */
    accommodation: boolean;
    /** 交通信息 */
    transportation: boolean;
    /** 每日行程 */
    dailyItinerary: boolean;
    /** 餐饮推荐 */
    meals: boolean;
    /** 费用预估 */
    budget: boolean;
  };
}

export interface PdfGenerationProgress {
  /** 当前步骤 */
  step: string;

  /** 进度百分比 (0-100) */
  progress: number;

  /** 是否完成 */
  completed: boolean;

  /** 错误信息 */
  error?: string;
}

export interface PdfFont {
  /** 字体名称 */
  name: string;

  /** 字体文件 URL 或 Base64 */
  data: string;

  /** 字体样式 */
  style: 'normal' | 'bold' | 'italic';
}
