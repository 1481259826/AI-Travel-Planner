/**
 * 语音转写 API 端点
 * 返回科大讯飞 WebSocket 鉴权参数，供前端直接连接
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateXFYunAuthUrl } from '@/lib/xfyun-voice';
import { getUserApiKeyConfig } from '@/lib/api-keys';
import { config } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }

    const token = authorization.replace('Bearer ', '');

    // 验证用户
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: '未授权，请先登录' },
        { status: 401 }
      );
    }

    // 创建使用用户 token 的 Supabase 客户端（用于 RLS）
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseWithAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // 获取用户自定义或系统默认的语音 API 配置
    let appId = config.voice.appId;
    let apiKey = config.voice.apiKey;
    let apiSecret = '';

    // 优先使用用户自定义配置
    const userConfig = await getUserApiKeyConfig(user.id, 'voice', supabaseWithAuth);

    if (userConfig) {
      appId = userConfig.extraConfig?.app_id || appId;
      apiKey = userConfig.apiKey;

      // API Secret 可能存储在 extraConfig 中
      apiSecret = userConfig.extraConfig?.api_secret || '';
    } else {
      // 使用系统默认配置
      apiSecret = process.env.VOICE_API_SECRET || '';
    }

    // 验证必要参数
    if (!appId || !apiKey) {
      return NextResponse.json(
        {
          error: '语音 API 未配置',
          message: '请在设置页面配置科大讯飞语音 API，或联系管理员配置系统 API Key',
        },
        { status: 400 }
      );
    }

    if (!apiSecret) {
      return NextResponse.json(
        {
          error: 'API Secret 缺失',
          message: '科大讯飞语音识别需要 API Secret，请完善配置',
        },
        { status: 400 }
      );
    }

    // 生成鉴权 URL
    try {
      const authUrl = generateXFYunAuthUrl({
        appId,
        apiKey,
        apiSecret,
      });

      return NextResponse.json({
        success: true,
        authUrl,
        appId,
      });
    } catch (error: any) {
      console.error('[Voice API] 生成鉴权 URL 失败:', error);
      return NextResponse.json(
        {
          error: '生成鉴权参数失败',
          message: error.message || '未知错误',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Voice API] 服务器错误:', error);
    return NextResponse.json(
      {
        error: '服务器错误',
        message: error.message || '未知错误',
      },
      { status: 500 }
    );
  }
}
