/**
 * 自然语言日期解析工具
 * 支持解析：明天、后天、下周、X天后、具体日期等
 */

/**
 * 解析自然语言日期为 YYYY-MM-DD 格式
 */
export function parseNaturalDate(input: string, referenceDate: Date = new Date()): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const normalizedInput = input.trim().toLowerCase();

  // 已经是标准格式 YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedInput)) {
    return normalizedInput;
  }

  // 今天
  if (/^(今天|今日)$/.test(normalizedInput)) {
    return formatDate(referenceDate);
  }

  // 明天
  if (/^(明天|明日)$/.test(normalizedInput)) {
    const tomorrow = new Date(referenceDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDate(tomorrow);
  }

  // 后天
  if (/^(后天|後天)$/.test(normalizedInput)) {
    const dayAfterTomorrow = new Date(referenceDate);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    return formatDate(dayAfterTomorrow);
  }

  // X天后 (如：3天后、5天后)
  const daysLaterMatch = normalizedInput.match(/^(\d+)\s*(天|日)后/);
  if (daysLaterMatch) {
    const days = parseInt(daysLaterMatch[1], 10);
    const futureDate = new Date(referenceDate);
    futureDate.setDate(futureDate.getDate() + days);
    return formatDate(futureDate);
  }

  // 下周X (如：下周一、下周五)
  const nextWeekMatch = normalizedInput.match(/^下(周|星期)([一二三四五六日天]|[1-7])$/);
  if (nextWeekMatch) {
    const weekdayStr = nextWeekMatch[2];
    const targetWeekday = parseWeekday(weekdayStr);
    if (targetWeekday !== null) {
      const nextWeek = getNextWeekday(referenceDate, targetWeekday, true);
      return formatDate(nextWeek);
    }
  }

  // 本周X (如：本周五、周六)
  const thisWeekMatch = normalizedInput.match(/^(本)?(周|星期)([一二三四五六日天]|[1-7])$/);
  if (thisWeekMatch) {
    const weekdayStr = thisWeekMatch[3];
    const targetWeekday = parseWeekday(weekdayStr);
    if (targetWeekday !== null) {
      const thisWeek = getNextWeekday(referenceDate, targetWeekday, false);
      return formatDate(thisWeek);
    }
  }

  // X月X日 (如：3月15日、12月1日)
  const monthDayMatch = normalizedInput.match(/^(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?$/);
  if (monthDayMatch) {
    const month = parseInt(monthDayMatch[1], 10);
    const day = parseInt(monthDayMatch[2], 10);
    const year = referenceDate.getFullYear();

    // 判断是今年还是明年
    const targetDate = new Date(year, month - 1, day);
    if (targetDate < referenceDate) {
      targetDate.setFullYear(year + 1);
    }

    return formatDate(targetDate);
  }

  // 完整日期 (如：2024年3月15日、2024/3/15)
  const fullDateMatch = normalizedInput.match(/^(\d{4})\s*[年/-]\s*(\d{1,2})\s*[月/-]\s*(\d{1,2})\s*[日号]?$/);
  if (fullDateMatch) {
    const year = parseInt(fullDateMatch[1], 10);
    const month = parseInt(fullDateMatch[2], 10);
    const day = parseInt(fullDateMatch[3], 10);
    const targetDate = new Date(year, month - 1, day);
    return formatDate(targetDate);
  }

  return null;
}

/**
 * 解析星期几
 */
function parseWeekday(weekdayStr: string): number | null {
  const weekdayMap: { [key: string]: number } = {
    '一': 1, '1': 1,
    '二': 2, '2': 2,
    '三': 3, '3': 3,
    '四': 4, '4': 4,
    '五': 5, '5': 5,
    '六': 6, '6': 6,
    '日': 0, '天': 0, '7': 0, '0': 0,
  };

  return weekdayMap[weekdayStr] ?? null;
}

/**
 * 获取下一个指定星期几的日期
 */
function getNextWeekday(referenceDate: Date, targetWeekday: number, nextWeek: boolean = false): Date {
  const result = new Date(referenceDate);
  const currentWeekday = result.getDay();

  let daysToAdd = targetWeekday - currentWeekday;

  if (nextWeek) {
    // 下周：总是加至少7天
    if (daysToAdd <= 0) {
      daysToAdd += 7;
    } else {
      daysToAdd += 7;
    }
  } else {
    // 本周：如果目标日期已过，跳到下周
    if (daysToAdd < 0) {
      daysToAdd += 7;
    } else if (daysToAdd === 0 && referenceDate.getTime() > result.getTime()) {
      daysToAdd = 7;
    }
  }

  result.setDate(result.getDate() + daysToAdd);
  return result;
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 解析旅行天数（如：3天、5天4晚、一周）
 */
export function parseTripDuration(input: string): number | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const normalizedInput = input.trim().toLowerCase();

  // X天 (如：3天、5天)
  const daysMatch = normalizedInput.match(/(\d+)\s*天/);
  if (daysMatch) {
    return parseInt(daysMatch[1], 10);
  }

  // X天Y晚 (如：5天4晚，取天数)
  const daysNightsMatch = normalizedInput.match(/(\d+)\s*天\s*\d+\s*晚/);
  if (daysNightsMatch) {
    return parseInt(daysNightsMatch[1], 10);
  }

  // 一周、两周
  const weekMatch = normalizedInput.match(/([一二三四1-4])?\s*(周|星期|礼拜)/);
  if (weekMatch) {
    const weekCount = weekMatch[1] ? parseChineseNumber(weekMatch[1]) : 1;
    return weekCount * 7;
  }

  // 一个月
  if (/一?个?月/.test(normalizedInput)) {
    return 30;
  }

  return null;
}

/**
 * 解析中文数字
 */
function parseChineseNumber(str: string): number {
  const numberMap: { [key: string]: number } = {
    '一': 1, '二': 2, '三': 3, '四': 4,
    '1': 1, '2': 2, '3': 3, '4': 4,
  };

  return numberMap[str] || 1;
}

/**
 * 根据开始日期和天数计算结束日期
 */
export function calculateEndDate(startDate: string, duration: number): string {
  const start = new Date(startDate);
  start.setDate(start.getDate() + duration - 1); // 减1因为起始日也算一天
  return formatDate(start);
}

/**
 * 解析预算金额（如：5000、5000元、1万、1.5万元）
 */
export function parseBudget(input: string): number | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const normalizedInput = input.trim().toLowerCase().replace(/,/g, '');

  // 纯数字
  if (/^\d+(\.\d+)?$/.test(normalizedInput)) {
    return parseFloat(normalizedInput);
  }

  // X元、X块、X块钱
  const yuanMatch = normalizedInput.match(/(\d+(?:\.\d+)?)\s*[元块]/);
  if (yuanMatch) {
    return parseFloat(yuanMatch[1]);
  }

  // X万、X万元
  const wanMatch = normalizedInput.match(/(\d+(?:\.\d+)?)\s*万/);
  if (wanMatch) {
    return parseFloat(wanMatch[1]) * 10000;
  }

  // Xk、X千
  const thousandMatch = normalizedInput.match(/(\d+(?:\.\d+)?)\s*[k千]/);
  if (thousandMatch) {
    return parseFloat(thousandMatch[1]) * 1000;
  }

  return null;
}

/**
 * 解析人数（如：2人、3个人、两人）
 */
export function parseTravelers(input: string): number | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const normalizedInput = input.trim().toLowerCase();

  // 纯数字
  if (/^\d+$/.test(normalizedInput)) {
    return parseInt(normalizedInput, 10);
  }

  // X人、X个人
  const peopleMatch = normalizedInput.match(/(\d+)\s*(人|个人)/);
  if (peopleMatch) {
    return parseInt(peopleMatch[1], 10);
  }

  // 中文数字（一人、两人等）
  const chineseMap: { [key: string]: number } = {
    '一': 1, '两': 2, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  };

  for (const [chinese, num] of Object.entries(chineseMap)) {
    if (normalizedInput.includes(chinese)) {
      return num;
    }
  }

  return null;
}
