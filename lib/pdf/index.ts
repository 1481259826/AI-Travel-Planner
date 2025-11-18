/**
 * PDF 导出模块统一入口
 *
 * 提供完整的 PDF 生成和导出功能
 */

// 主导出函数 - 从 lib/exportTripToPDF.ts 重新导出
export { exportTripToPDF } from '../exportTripToPDF';

// 类型定义
export type {
  ExportOptions,
  PdfGenerationProgress,
  PdfFont,
  PdfConfig,
  PdfPageInfo,
} from './types';

// 辅助工具函数
export {
  formatCurrency,
  calculateDays,
  formatDate,
  formatDateRange,
  captureElement,
  captureMap,
  captureChart,
  isMobileDevice,
  base64ToBlob,
  downloadFile,
  openPdfInNewWindow,
  generatePdfFilename,
  wrapText,
  getActivityTypeLabel,
  getAccommodationTypeLabel,
} from './helpers';

// 布局常量
export {
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN,
  CONTENT_WIDTH,
} from './utils/layout';

// Sections - 导出各个章节生成函数（高级用法）
export { addCoverPage } from './sections/cover';
export { addOverview } from './sections/overview';
export { addAccommodation } from './sections/accommodation';
export { addTransportation } from './sections/transportation';
export { addDailyItinerary } from './sections/daily';
export { addBudgetBreakdown } from './sections/budget';
export { addMapPage } from './sections/map';
export { addChartPage } from './sections/chart';

// 页脚工具
export { addPageFooter } from './utils/footer';
