/**
 * 语音转写 API 端点
 * 返回科大讯飞 WebSocket 鉴权参数，供前端直接连接
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '@/app/api/_middleware/auth';
import { handleApiError } from '@/app/api/_middleware/error-handler';
import { successResponse } from '@/app/api/_utils/response';
import { generateXFYunAuthUrl } from '@/lib/xfyun-voice';
import { getUserApiKeyConfig } from '@/lib/api-keys';
import { config } from '@/lib/config';
import { ConfigurationError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await requireAuth(request);

    // 获取用户自定义或系统默认的语音 API 配置
    let appId = config.voice.appId;
    let apiKey = config.voice.apiKey;
    let apiSecret = '';

    // 优先使用用户自定义配置
    const userConfig = await getUserApiKeyConfig(user.id, 'voice', supabase);

    if (userConfig) {
      appId = userConfig.extraConfig?.app_id || appId;
      apiKey = userConfig.apiKey;

      // API Secret 可能存储在 extraConfig 中
      apiSecret = userConfig.extraConfig?.api_secret || '';
    } else {
      // 使用系统默认配置
      apiSecret = config.voice.apiSecret;
    }

    // 调试日志：显示实际读取到的配置
    console.log('[Voice API] 配置检查:', {
      appId: appId ? '已配置' : '未配置',
      apiKey: apiKey ? '已配置' : '未配置',
      apiSecret: apiSecret ? '已配置' : '未配置',
      hasUserConfig: !!userConfig
    });

    // 验证必要参数
    if (!appId || !apiKey) {
      throw new ConfigurationError('请在设置页面配置科大讯飞语音 API，或联系管理员配置系统 API Key');
    }

    if (!apiSecret) {
      throw new ConfigurationError('科大讯飞语音识别需要 API Secret，请完善配置');
    }

    // 生成鉴权 URL
    try {
      const authUrl = generateXFYunAuthUrl({
        appId,
        apiKey,
        apiSecret,
      });

      return successResponse({
        authUrl,
        appId,
      });
    } catch (error: any) {
      console.error('[Voice API] 生成鉴权 URL 失败:', error);
      throw new Error(`生成鉴权参数失败: ${error.message || '未知错误'}`);
    }
  } catch (error) {
    return handleApiError(error, 'GET /api/voice/transcribe');
  }
}
