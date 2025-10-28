import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import config from '@/lib/config'
import { isPasswordValid } from '@/lib/utils/password'

/**
 * POST /api/user/password
 * 修改用户密码
 */
export async function POST(request: NextRequest) {
  try {
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

    const { current_password, new_password, confirm_password } = await request.json()

    // 验证输入
    if (!current_password || !new_password || !confirm_password) {
      return NextResponse.json(
        { error: '请填写所有字段' },
        { status: 400 }
      )
    }

    // 验证新密码和确认密码是否一致
    if (new_password !== confirm_password) {
      return NextResponse.json(
        { error: '两次输入的密码不一致' },
        { status: 400 }
      )
    }

    // 验证新密码强度
    if (!isPasswordValid(new_password)) {
      return NextResponse.json(
        { error: '密码强度不足，请满足所有要求' },
        { status: 400 }
      )
    }

    // 验证当前密码是否正确
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: current_password,
    })

    if (signInError) {
      return NextResponse.json(
        { error: '当前密码不正确' },
        { status: 400 }
      )
    }

    // 使用 Admin API 更新密码（需要 service role key）
    const adminClient = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { password: new_password }
    )

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json(
        { error: '密码修改失败，请重试' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: '密码修改成功！请使用新密码重新登录'
    })
  } catch (error) {
    console.error('Password change error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
