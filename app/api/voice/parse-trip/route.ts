/**
 * AI 语音解析 API
 * 将自然语言转换为结构化的行程表单数据
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '@/app/api/_middleware/auth';
import { handleApiError } from '@/app/api/_middleware/error-handler';
import { successResponse } from '@/app/api/_utils/response';
import { ApiKeyClient } from '@/lib/api-keys';
import { config } from '@/lib/config';
import { ValidationError, ConfigurationError } from '@/lib/errors';
import {
  parseNaturalDate,
  parseTripDuration,
  calculateEndDate,
  parseBudget,
  parseTravelers,
} from '@/lib/date-parser';

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request);

    // 获取请求参数
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      throw new ValidationError('缺少语音文本');
    }

    console.log('[Voice Parse] 收到语音文本:', text);

    // 获取 AI API 配置
    const userConfig = await ApiKeyClient.getUserConfig(user.id, 'deepseek', supabase);
    const apiKey = userConfig?.apiKey || config.deepseek.apiKey;
    const baseURL = userConfig?.baseUrl || config.deepseek.baseURL;

    if (!apiKey) {
      throw new ConfigurationError('请在设置页面配置 DeepSeek API Key');
    }

    // 构建 AI Prompt
    const systemPrompt = `你是一个旅行规划助手。用户会用自然语言描述他们的旅行需求，你需要从中提取关键信息并输出 JSON 格式的结构化数据。

**提取字段说明：**
- destination: 目的地（必需，字符串）
- origin: 出发地（可选，字符串）
- start_date: 出发日期（格式 YYYY-MM-DD，尽量根据当前日期推断）
- end_date: 返回日期（格式 YYYY-MM-DD）
- duration: 旅行天数（数字，如果无法确定 end_date，可以根据 start_date + duration 计算）
- budget: 预算金额（数字，单位：元）
- travelers: 总人数（数字）
- adult_count: 成人数（数字）
- child_count: 儿童数（数字）
- preferences: 旅行偏好（字符串数组，从以下选项中选择：美食、购物、文化、自然、冒险、放松、摄影、亲子）
- hotel_preferences: 酒店偏好（字符串数组，从以下选项中选择：经济型、舒适型、高档型、豪华型、民宿、度假村、青年旅舍、特色酒店）
- additional_notes: 补充说明（字符串，任何未分类的额外信息）

**推断规则：**
1. 日期推断：
   - 如果用户说"明天"、"下周"等相对时间，根据今天 (${new Date().toLocaleDateString('zh-CN')}) 计算具体日期
   - 如果用户只说天数（如"5天"）而没有说出发日期，默认推断为7天后出发，然后根据天数计算 end_date
   - 如果用户说了出发日期但没说返回日期，根据 duration 计算 end_date
2. 人数推断：如果提到"带孩子"、"带小孩"，adult_count 至少为 1，child_count 至少为 1；如果只说"2人"，默认都是成人
3. 偏好推断：根据关键词推断，如"美食"、"动漫"（文化）、"海边"（自然）等
4. 预算推断：识别"1万"、"5000元"、"1.5万"等表达方式，转换为数字

**输出格式：**
仅输出 JSON，不要任何额外说明。格式如下：
\`\`\`json
{
  "destination": "日本",
  "origin": "上海",
  "start_date": "2025-11-15",
  "end_date": "2025-11-20",
  "duration": 5,
  "budget": 10000,
  "travelers": 2,
  "adult_count": 1,
  "child_count": 1,
  "preferences": ["美食", "文化", "亲子"],
  "hotel_preferences": ["舒适型", "特色酒店"],
  "additional_notes": "喜欢动漫相关景点"
}
\`\`\``;

    const userPrompt = `请解析以下旅行需求：\n\n"${text}"`;

    // 调用 DeepSeek API
    try {
      const response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`AI API 错误: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;

      if (!aiResponse) {
        throw new Error('AI 返回空响应');
      }

      console.log('[Voice Parse] AI 原始响应:', aiResponse);

      // 解析 JSON（支持代码块包裹）
      let parsedData: any;
      try {
        const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonText = jsonMatch ? jsonMatch[1].trim() : aiResponse.trim();
        parsedData = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('[Voice Parse] JSON 解析失败:', parseError);
        throw new Error('AI 返回的数据格式不正确');
      }

      // 后处理：使用本地解析器增强日期和数字识别
      if (parsedData.start_date && typeof parsedData.start_date === 'string') {
        const parsedStartDate = parseNaturalDate(parsedData.start_date);
        if (parsedStartDate) {
          parsedData.start_date = parsedStartDate;
        }
      }

      if (parsedData.end_date && typeof parsedData.end_date === 'string') {
        const parsedEndDate = parseNaturalDate(parsedData.end_date);
        if (parsedEndDate) {
          parsedData.end_date = parsedEndDate;
        }
      }

      // 如果只有 duration 没有日期，生成默认的 start_date（7天后）
      if (parsedData.duration && !parsedData.start_date && !parsedData.end_date) {
        const defaultStartDate = new Date();
        defaultStartDate.setDate(defaultStartDate.getDate() + 7);
        parsedData.start_date = defaultStartDate.toISOString().split('T')[0];
      }

      // 如果有 duration 但没有 end_date，计算 end_date
      if (parsedData.start_date && parsedData.duration && !parsedData.end_date) {
        parsedData.end_date = calculateEndDate(parsedData.start_date, parsedData.duration);
      }

      // 使用本地解析器增强预算识别
      if (!parsedData.budget && text) {
        const budgetFromText = parseBudget(text);
        if (budgetFromText) {
          parsedData.budget = budgetFromText;
        }
      }

      // 使用本地解析器增强人数识别
      if (!parsedData.travelers && text) {
        const travelersFromText = parseTravelers(text);
        if (travelersFromText) {
          parsedData.travelers = travelersFromText;
        }
      }

      // 验证必需字段
      if (!parsedData.destination) {
        throw new ValidationError('无法识别目的地，请提供更清晰的描述');
      }

      console.log('[Voice Parse] 解析成功:', parsedData);

      // 直接返回解析后的数据，不需要额外包装
      return successResponse(parsedData);
    } catch (aiError: any) {
      console.error('[Voice Parse] AI 调用失败:', aiError);
      throw new Error(`AI 解析失败: ${aiError.message || '未知错误'}`);
    }
  } catch (error) {
    return handleApiError(error, 'POST /api/voice/parse-trip');
  }
}
