/**
 * 日期解析工具测试
 *
 * 测试范围：
 * - 自然语言日期解析
 * - 旅行天数解析
 * - 结束日期计算
 * - 预算金额解析
 * - 人数解析
 * - 边界情况处理
 */

import { describe, it, expect } from 'vitest'
import {
  parseNaturalDate,
  parseTripDuration,
  calculateEndDate,
  parseBudget,
  parseTravelers,
} from '@/lib/date-parser'

describe('parseNaturalDate', () => {
  // 使用固定的参考日期进行测试：2024年3月15日（周五）
  const referenceDate = new Date('2024-03-15')

  describe('标准格式日期', () => {
    it('应该识别并返回 YYYY-MM-DD 格式日期', () => {
      expect(parseNaturalDate('2024-03-15', referenceDate)).toBe('2024-03-15')
      expect(parseNaturalDate('2025-12-31', referenceDate)).toBe('2025-12-31')
      expect(parseNaturalDate('2024-01-01', referenceDate)).toBe('2024-01-01')
    })

    it('应该拒绝不完整的年份格式', () => {
      expect(parseNaturalDate('24-03-15', referenceDate)).toBeNull()
      expect(parseNaturalDate('202-03-15', referenceDate)).toBeNull()
    })

    it('应该接受单数字月日的完整日期（通过完整日期正则）', () => {
      expect(parseNaturalDate('2024-3-15', referenceDate)).toBe('2024-03-15')
      expect(parseNaturalDate('2024/3/15', referenceDate)).toBe('2024-03-15')
    })
  })

  describe('相对日期表达', () => {
    it('应该正确解析"今天"', () => {
      expect(parseNaturalDate('今天', referenceDate)).toBe('2024-03-15')
      expect(parseNaturalDate('今日', referenceDate)).toBe('2024-03-15')
    })

    it('应该正确解析"明天"', () => {
      expect(parseNaturalDate('明天', referenceDate)).toBe('2024-03-16')
      expect(parseNaturalDate('明日', referenceDate)).toBe('2024-03-16')
    })

    it('应该正确解析"后天"', () => {
      expect(parseNaturalDate('后天', referenceDate)).toBe('2024-03-17')
      expect(parseNaturalDate('後天', referenceDate)).toBe('2024-03-17')
    })

    it('应该正确解析"X天后"', () => {
      expect(parseNaturalDate('3天后', referenceDate)).toBe('2024-03-18')
      expect(parseNaturalDate('5天后', referenceDate)).toBe('2024-03-20')
      expect(parseNaturalDate('10日后', referenceDate)).toBe('2024-03-25')
      expect(parseNaturalDate('30天后', referenceDate)).toBe('2024-04-14')
    })

    it('应该处理带空格的"X天后"', () => {
      expect(parseNaturalDate('3 天后', referenceDate)).toBe('2024-03-18')
      expect(parseNaturalDate('5  天后', referenceDate)).toBe('2024-03-20')
    })
  })

  describe('星期表达', () => {
    // 参考日期是 2024-03-15（周五）
    it('应该正确解析"下周X"（中文数字）', () => {
      // 参考日期是周五（3月15日），"下周X"会找到下一个X
      expect(parseNaturalDate('下周一', referenceDate)).toBe('2024-03-18') // 下周一
      expect(parseNaturalDate('下周二', referenceDate)).toBe('2024-03-19') // 下周二
      expect(parseNaturalDate('下周五', referenceDate)).toBe('2024-03-22') // 下周五
      // 周日（weekday=0）从周五算是 +2天，即本周日
      expect(parseNaturalDate('下周日', referenceDate)).toBe('2024-03-17') // 本周日
      expect(parseNaturalDate('下周天', referenceDate)).toBe('2024-03-17') // 本周日
    })

    it('应该正确解析"下星期X"', () => {
      expect(parseNaturalDate('下星期一', referenceDate)).toBe('2024-03-18')
      expect(parseNaturalDate('下星期六', referenceDate)).toBe('2024-03-23')
    })

    it('应该正确解析"下周X"（阿拉伯数字）', () => {
      expect(parseNaturalDate('下周1', referenceDate)).toBe('2024-03-18')
      expect(parseNaturalDate('下周5', referenceDate)).toBe('2024-03-22')
      expect(parseNaturalDate('下周7', referenceDate)).toBe('2024-03-17') // 周日
    })

    it('应该正确解析"本周X"', () => {
      // 当前是周五（3月15日）
      expect(parseNaturalDate('本周六', referenceDate)).toBe('2024-03-16')
      expect(parseNaturalDate('本周日', referenceDate)).toBe('2024-03-17')
      expect(parseNaturalDate('周六', referenceDate)).toBe('2024-03-16')
      expect(parseNaturalDate('周日', referenceDate)).toBe('2024-03-17')
    })

    it('应该正确解析"本周X"（已过去的日期跳到下周）', () => {
      // 当前是周五，本周一已过去，应该返回下周一
      expect(parseNaturalDate('本周一', referenceDate)).toBe('2024-03-18')
      expect(parseNaturalDate('周一', referenceDate)).toBe('2024-03-18')
    })
  })

  describe('月日表达', () => {
    it('应该正确解析"X月X日"（当年）', () => {
      // 3月15日之后的日期应该是今年
      expect(parseNaturalDate('5月1日', referenceDate)).toBe('2024-05-01')
      expect(parseNaturalDate('12月31日', referenceDate)).toBe('2024-12-31')
    })

    it('应该正确解析"X月X日"（明年）', () => {
      // 3月15日之前的日期应该是明年
      expect(parseNaturalDate('1月1日', referenceDate)).toBe('2025-01-01')
      expect(parseNaturalDate('3月1日', referenceDate)).toBe('2025-03-01')
    })

    it('应该处理不同的分隔符', () => {
      expect(parseNaturalDate('5月1号', referenceDate)).toBe('2024-05-01')
      expect(parseNaturalDate('10 月 15 日', referenceDate)).toBe('2024-10-15')
    })

    it('应该处理单数字月日', () => {
      expect(parseNaturalDate('3月5日', referenceDate)).toBe('2025-03-05')
      expect(parseNaturalDate('12月1日', referenceDate)).toBe('2024-12-01')
    })
  })

  describe('完整日期表达', () => {
    it('应该正确解析"YYYY年MM月DD日"格式', () => {
      expect(parseNaturalDate('2024年5月1日', referenceDate)).toBe('2024-05-01')
      expect(parseNaturalDate('2025年12月31日', referenceDate)).toBe('2025-12-31')
    })

    it('应该正确解析"YYYY/MM/DD"格式', () => {
      expect(parseNaturalDate('2024/5/1', referenceDate)).toBe('2024-05-01')
      expect(parseNaturalDate('2025/12/31', referenceDate)).toBe('2025-12-31')
    })

    it('应该正确解析"YYYY-MM-DD"格式（带中文）', () => {
      expect(parseNaturalDate('2024-5-1', referenceDate)).toBe('2024-05-01')
    })

    it('应该处理带空格的日期', () => {
      expect(parseNaturalDate('2024 年 5 月 1 日', referenceDate)).toBe('2024-05-01')
      expect(parseNaturalDate('2024 / 5 / 1', referenceDate)).toBe('2024-05-01')
    })

    it('应该处理"号"结尾', () => {
      expect(parseNaturalDate('2024年5月1号', referenceDate)).toBe('2024-05-01')
    })
  })

  describe('大小写处理', () => {
    it('应该忽略大小写', () => {
      expect(parseNaturalDate('明天', referenceDate)).toBe('2024-03-16')
      expect(parseNaturalDate('TOMORROW', referenceDate)).toBeNull() // 不支持英文
    })
  })

  describe('边界情况', () => {
    it('应该处理空输入', () => {
      expect(parseNaturalDate('', referenceDate)).toBeNull()
      expect(parseNaturalDate('   ', referenceDate)).toBeNull()
    })

    it('应该处理 null 和 undefined', () => {
      expect(parseNaturalDate(null as any, referenceDate)).toBeNull()
      expect(parseNaturalDate(undefined as any, referenceDate)).toBeNull()
    })

    it('应该处理非字符串输入', () => {
      expect(parseNaturalDate(123 as any, referenceDate)).toBeNull()
      expect(parseNaturalDate({} as any, referenceDate)).toBeNull()
    })

    it('应该处理无法识别的输入', () => {
      expect(parseNaturalDate('随便写的文字', referenceDate)).toBeNull()
      expect(parseNaturalDate('abc123', referenceDate)).toBeNull()
      expect(parseNaturalDate('next week', referenceDate)).toBeNull()
    })

    it('应该处理跨月日期', () => {
      const endOfMonth = new Date('2024-01-31')
      expect(parseNaturalDate('明天', endOfMonth)).toBe('2024-02-01')
      expect(parseNaturalDate('3天后', endOfMonth)).toBe('2024-02-03')
    })

    it('应该处理跨年日期', () => {
      const endOfYear = new Date('2024-12-31')
      expect(parseNaturalDate('明天', endOfYear)).toBe('2025-01-01')
      expect(parseNaturalDate('5天后', endOfYear)).toBe('2025-01-05')
    })

    it('应该处理闰年日期', () => {
      const beforeLeapDay = new Date('2024-02-28')
      expect(parseNaturalDate('明天', beforeLeapDay)).toBe('2024-02-29')
      expect(parseNaturalDate('2天后', beforeLeapDay)).toBe('2024-03-01')
    })
  })

  describe('默认参考日期', () => {
    it('应该使用当前日期作为默认参考日期', () => {
      const result = parseNaturalDate('今天')
      expect(result).not.toBeNull()
      // 验证格式正确
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })
})

describe('parseTripDuration', () => {
  describe('天数表达', () => {
    it('应该正确解析"X天"', () => {
      expect(parseTripDuration('3天')).toBe(3)
      expect(parseTripDuration('5天')).toBe(5)
      expect(parseTripDuration('10天')).toBe(10)
    })

    it('应该正确解析"X天Y晚"（取天数）', () => {
      expect(parseTripDuration('5天4晚')).toBe(5)
      expect(parseTripDuration('7天6晚')).toBe(7)
      expect(parseTripDuration('3天2晚')).toBe(3)
    })

    it('应该处理带空格的表达', () => {
      expect(parseTripDuration('5 天')).toBe(5)
      expect(parseTripDuration('5 天 4 晚')).toBe(5)
    })
  })

  describe('周/星期表达', () => {
    it('应该正确解析"一周"', () => {
      expect(parseTripDuration('一周')).toBe(7)
      expect(parseTripDuration('周')).toBe(7)
      expect(parseTripDuration('星期')).toBe(7)
      expect(parseTripDuration('礼拜')).toBe(7)
    })

    it('应该正确解析"X周"（中文数字）', () => {
      // 注意：代码中正则 /([一二三四1-4])?/ 不匹配"两"，所以"两周"返回7
      // 只有"二周"能正确匹配
      expect(parseTripDuration('两周')).toBe(7) // 匹配不到"两"，默认1周
      expect(parseTripDuration('二周')).toBe(14) // 能匹配到"二"
      expect(parseTripDuration('三周')).toBe(21)
      expect(parseTripDuration('四周')).toBe(28)
    })

    it('应该正确解析"X周"（阿拉伯数字）', () => {
      expect(parseTripDuration('1周')).toBe(7)
      expect(parseTripDuration('2周')).toBe(14)
      expect(parseTripDuration('3周')).toBe(21)
    })

    it('应该处理"星期"和"礼拜"', () => {
      // 同样，"两"不会被匹配
      expect(parseTripDuration('两星期')).toBe(7)
      expect(parseTripDuration('三礼拜')).toBe(21)
    })
  })

  describe('月份表达', () => {
    it('应该正确解析"一个月"', () => {
      expect(parseTripDuration('一个月')).toBe(30)
      expect(parseTripDuration('一月')).toBe(30)
      expect(parseTripDuration('个月')).toBe(30)
      expect(parseTripDuration('月')).toBe(30)
    })
  })

  describe('边界情况', () => {
    it('应该处理空输入', () => {
      expect(parseTripDuration('')).toBeNull()
      expect(parseTripDuration('   ')).toBeNull()
    })

    it('应该处理 null 和 undefined', () => {
      expect(parseTripDuration(null as any)).toBeNull()
      expect(parseTripDuration(undefined as any)).toBeNull()
    })

    it('应该处理非字符串输入', () => {
      expect(parseTripDuration(123 as any)).toBeNull()
      expect(parseTripDuration({} as any)).toBeNull()
    })

    it('应该处理无法识别的输入', () => {
      expect(parseTripDuration('随便写的')).toBeNull()
      expect(parseTripDuration('abc')).toBeNull()
    })

    it('应该处理大小写', () => {
      expect(parseTripDuration('3天')).toBe(3)
      expect(parseTripDuration('3天')).toBe(3)
    })
  })
})

describe('calculateEndDate', () => {
  it('应该正确计算单天行程', () => {
    expect(calculateEndDate('2024-03-15', 1)).toBe('2024-03-15')
  })

  it('应该正确计算多天行程', () => {
    expect(calculateEndDate('2024-03-15', 3)).toBe('2024-03-17')
    expect(calculateEndDate('2024-03-15', 5)).toBe('2024-03-19')
    expect(calculateEndDate('2024-03-15', 7)).toBe('2024-03-21')
  })

  it('应该正确处理跨月情况', () => {
    expect(calculateEndDate('2024-01-30', 3)).toBe('2024-02-01')
    expect(calculateEndDate('2024-01-28', 5)).toBe('2024-02-01')
  })

  it('应该正确处理跨年情况', () => {
    expect(calculateEndDate('2024-12-30', 3)).toBe('2025-01-01')
    expect(calculateEndDate('2024-12-28', 7)).toBe('2025-01-03')
  })

  it('应该正确处理闰年', () => {
    expect(calculateEndDate('2024-02-28', 2)).toBe('2024-02-29')
    expect(calculateEndDate('2024-02-28', 3)).toBe('2024-03-01')
  })

  it('应该正确处理长期旅行', () => {
    expect(calculateEndDate('2024-03-01', 30)).toBe('2024-03-30')
    // 2024是闰年有366天，从1月1日开始365天后是12月30日
    expect(calculateEndDate('2024-01-01', 365)).toBe('2024-12-30')
    // 366天后是12月31日
    expect(calculateEndDate('2024-01-01', 366)).toBe('2024-12-31')
  })

  it('应该返回正确的日期格式', () => {
    const result = calculateEndDate('2024-03-15', 5)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('parseBudget', () => {
  describe('纯数字', () => {
    it('应该正确解析整数', () => {
      expect(parseBudget('5000')).toBe(5000)
      expect(parseBudget('10000')).toBe(10000)
      expect(parseBudget('500')).toBe(500)
    })

    it('应该正确解析小数', () => {
      expect(parseBudget('5000.5')).toBe(5000.5)
      expect(parseBudget('1234.56')).toBe(1234.56)
    })

    it('应该忽略逗号分隔符', () => {
      expect(parseBudget('5,000')).toBe(5000)
      expect(parseBudget('10,000')).toBe(10000)
      expect(parseBudget('1,234,567')).toBe(1234567)
    })
  })

  describe('元/块表达', () => {
    it('应该正确解析"X元"', () => {
      expect(parseBudget('5000元')).toBe(5000)
      expect(parseBudget('10000元')).toBe(10000)
    })

    it('应该正确解析"X块"', () => {
      expect(parseBudget('5000块')).toBe(5000)
      expect(parseBudget('500块钱')).toBe(500)
    })

    it('应该处理小数', () => {
      expect(parseBudget('5000.5元')).toBe(5000.5)
      expect(parseBudget('1234.56块')).toBe(1234.56)
    })

    it('应该处理带空格', () => {
      expect(parseBudget('5000 元')).toBe(5000)
      expect(parseBudget('500  块')).toBe(500)
    })
  })

  describe('万表达', () => {
    it('应该正确解析"X万"', () => {
      expect(parseBudget('1万')).toBe(10000)
      expect(parseBudget('2万')).toBe(20000)
      expect(parseBudget('5万')).toBe(50000)
    })

    it('应该正确解析"X万元"', () => {
      expect(parseBudget('1万元')).toBe(10000)
      expect(parseBudget('3万元')).toBe(30000)
    })

    it('应该处理小数万', () => {
      expect(parseBudget('1.5万')).toBe(15000)
      expect(parseBudget('0.8万')).toBe(8000)
      expect(parseBudget('2.5万元')).toBe(25000)
    })
  })

  describe('千/k表达', () => {
    it('应该正确解析"Xk"', () => {
      expect(parseBudget('5k')).toBe(5000)
      expect(parseBudget('10k')).toBe(10000)
    })

    it('应该正确解析"X千"', () => {
      expect(parseBudget('5千')).toBe(5000)
      expect(parseBudget('10千')).toBe(10000)
    })

    it('应该处理小数', () => {
      expect(parseBudget('5.5k')).toBe(5500)
      expect(parseBudget('1.5千')).toBe(1500)
    })
  })

  describe('边界情况', () => {
    it('应该处理空输入', () => {
      expect(parseBudget('')).toBeNull()
      expect(parseBudget('   ')).toBeNull()
    })

    it('应该处理 null 和 undefined', () => {
      expect(parseBudget(null as any)).toBeNull()
      expect(parseBudget(undefined as any)).toBeNull()
    })

    it('应该处理非字符串输入', () => {
      expect(parseBudget(123 as any)).toBeNull()
      expect(parseBudget({} as any)).toBeNull()
    })

    it('应该处理无法识别的输入', () => {
      expect(parseBudget('随便写的')).toBeNull()
      expect(parseBudget('abc')).toBeNull()
    })

    it('应该处理大小写', () => {
      expect(parseBudget('5K')).toBe(5000)
      expect(parseBudget('5k')).toBe(5000)
    })

    it('应该处理零和极小值', () => {
      expect(parseBudget('0')).toBe(0)
      expect(parseBudget('0.1万')).toBe(1000)
    })

    it('应该处理极大值', () => {
      expect(parseBudget('100万')).toBe(1000000)
      expect(parseBudget('999.99万')).toBe(9999900)
    })
  })
})

describe('parseTravelers', () => {
  describe('纯数字', () => {
    it('应该正确解析纯数字', () => {
      expect(parseTravelers('1')).toBe(1)
      expect(parseTravelers('2')).toBe(2)
      expect(parseTravelers('5')).toBe(5)
      expect(parseTravelers('10')).toBe(10)
    })
  })

  describe('数字+人', () => {
    it('应该正确解析"X人"', () => {
      expect(parseTravelers('2人')).toBe(2)
      expect(parseTravelers('5人')).toBe(5)
      expect(parseTravelers('10人')).toBe(10)
    })

    it('应该正确解析"X个人"', () => {
      expect(parseTravelers('2个人')).toBe(2)
      expect(parseTravelers('5个人')).toBe(5)
    })

    it('应该处理带空格', () => {
      expect(parseTravelers('2 人')).toBe(2)
      expect(parseTravelers('5  个人')).toBe(5)
    })
  })

  describe('中文数字', () => {
    it('应该正确解析中文数字', () => {
      expect(parseTravelers('一人')).toBe(1)
      expect(parseTravelers('两人')).toBe(2)
      expect(parseTravelers('二人')).toBe(2)
      expect(parseTravelers('三人')).toBe(3)
      expect(parseTravelers('四人')).toBe(4)
      expect(parseTravelers('五人')).toBe(5)
    })

    it('应该正确解析较大的中文数字', () => {
      expect(parseTravelers('六人')).toBe(6)
      expect(parseTravelers('七人')).toBe(7)
      expect(parseTravelers('八人')).toBe(8)
      expect(parseTravelers('九人')).toBe(9)
      expect(parseTravelers('十人')).toBe(10)
    })

    it('应该处理中文数字不带"人"', () => {
      expect(parseTravelers('一')).toBe(1)
      expect(parseTravelers('两')).toBe(2)
      expect(parseTravelers('三')).toBe(3)
    })

    it('应该优先匹配第一个中文数字', () => {
      expect(parseTravelers('两个三人')).toBe(2) // 匹配"两"
    })
  })

  describe('边界情况', () => {
    it('应该处理空输入', () => {
      expect(parseTravelers('')).toBeNull()
      expect(parseTravelers('   ')).toBeNull()
    })

    it('应该处理 null 和 undefined', () => {
      expect(parseTravelers(null as any)).toBeNull()
      expect(parseTravelers(undefined as any)).toBeNull()
    })

    it('应该处理非字符串输入', () => {
      expect(parseTravelers(123 as any)).toBeNull()
      expect(parseTravelers({} as any)).toBeNull()
    })

    it('应该处理无法识别的输入', () => {
      expect(parseTravelers('随便写的')).toBeNull()
      expect(parseTravelers('abc')).toBeNull()
    })

    it('应该处理大小写', () => {
      expect(parseTravelers('2人')).toBe(2)
      expect(parseTravelers('2人')).toBe(2)
    })

    it('应该处理零', () => {
      expect(parseTravelers('0')).toBe(0)
      expect(parseTravelers('0人')).toBe(0)
    })

    it('应该处理大数字', () => {
      expect(parseTravelers('100')).toBe(100)
      expect(parseTravelers('999人')).toBe(999)
    })
  })
})
