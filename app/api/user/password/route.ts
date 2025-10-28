import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
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

    // 使用 Supabase Auth API 更新密码
    const { error: updateError } = await supabase.auth.updateUser({
      password: new_password,
    })

    if (updateError) {
      console.error('Password update error:', updateError)

      // 处理特定错误
      if (updateError.message.includes('same')) {
        return NextResponse.json(
          { error: '新密码不能与当前密码相同' },
          { status: 400 }
        )
      }

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
