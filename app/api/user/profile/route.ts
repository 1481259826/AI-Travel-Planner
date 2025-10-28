import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import config from '@/lib/config'
import type { ProfileUpdateData } from '@/types'

/**
 * GET /api/user/profile
 * 获取当前用户的配置信息
 */
export async function GET(request: NextRequest) {
  try {
    // 从请求头获取 Authorization token
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authorization.replace('Bearer ', '')

    // 创建带有用户认证的 Supabase 客户端（这样才能通过 RLS）
    const supabase = createClient(
      config.supabase.url,
      config.supabase.anonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    )

    // 验证用户
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 获取用户配置
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // 如果 profile 不存在，自动创建
    if (profileError && profileError.code === 'PGRST116') {
      console.log('Profile not found, creating new profile for user:', user.id)

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          avatar_url: user.user_metadata?.avatar_url || null,
          theme: 'system',
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating profile:', createError)
        return NextResponse.json(
          { error: 'Failed to create profile' },
          { status: 500 }
        )
      }

      return NextResponse.json({ profile: newProfile })
    }

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Profile GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/user/profile
 * 更新当前用户的配置信息
 */
export async function PUT(request: NextRequest) {
  try {
    // 从请求头获取 Authorization token
    const authorization = request.headers.get('authorization')
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authorization.replace('Bearer ', '')

    // 创建带有用户认证的 Supabase 客户端
    const supabase = createClient(
      config.supabase.url,
      config.supabase.anonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    )

    // 验证用户
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 解析请求体
    const updateData: ProfileUpdateData = await request.json()

    // 构建更新对象（只包含提供的字段）
    const updates: Record<string, any> = {}

    if (updateData.name !== undefined) updates.name = updateData.name
    if (updateData.avatar_url !== undefined) updates.avatar_url = updateData.avatar_url
    if (updateData.theme !== undefined) updates.theme = updateData.theme
    if (updateData.default_model !== undefined) updates.default_model = updateData.default_model
    if (updateData.default_budget !== undefined) updates.default_budget = updateData.default_budget
    if (updateData.default_origin !== undefined) updates.default_origin = updateData.default_origin

    // 更新用户配置
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile, message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Profile PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
