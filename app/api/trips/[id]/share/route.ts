import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateShareToken } from '@/lib/share'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// POST /api/trips/[id]/share - 生成或更新分享链接
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 获取 cookies
    const cookieStore = await cookies()

    // 创建 Supabase 客户端用于验证用户
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false
      }
    })

    // 尝试从 cookies 中获取 session
    const allCookies = cookieStore.getAll()
    let accessToken = null

    for (const cookie of allCookies) {
      if (cookie.name.includes('auth-token') || cookie.name.includes('access-token')) {
        accessToken = cookie.value
        break
      }
    }

    // 如果没有从 cookies 找到，尝试从 header 获取
    if (!accessToken) {
      const authHeader = request.headers.get('authorization')
      if (authHeader) {
        accessToken = authHeader.replace('Bearer ', '')
      }
    }

    if (!accessToken) {
      return NextResponse.json({ message: '未登录，请先登录' }, { status: 401 })
    }

    // 验证 token 并获取用户
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json({ message: '未授权，请重新登录' }, { status: 401 })
    }

    // 使用 service key 进行数据库操作
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const tripId = params.id

    // 获取请求数据
    const body = await request.json()
    const { is_public } = body

    if (typeof is_public !== 'boolean') {
      return NextResponse.json(
        { message: 'is_public 必须是布尔值' },
        { status: 400 }
      )
    }

    // 验证用户是否拥有该行程
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, user_id, share_token')
      .eq('id', tripId)
      .eq('user_id', user.id)
      .single()

    if (tripError || !trip) {
      return NextResponse.json(
        { message: '行程不存在或无权访问' },
        { status: 404 }
      )
    }

    // 生成新的 token（如果还没有）或使用现有的
    const shareToken = trip.share_token || generateShareToken()

    // 更新行程
    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update({
        share_token: shareToken,
        is_public: is_public
      })
      .eq('id', tripId)
      .select()
      .single()

    if (updateError) {
      console.error('更新分享设置失败:', updateError)
      return NextResponse.json(
        { message: '更新分享设置失败', error: updateError.message },
        { status: 500 }
      )
    }

    // 构造分享 URL
    const baseUrl = request.headers.get('origin') || ''
    const shareUrl = `${baseUrl}/share/${shareToken}`

    return NextResponse.json({
      share_token: shareToken,
      share_url: shareUrl,
      is_public: is_public
    })
  } catch (error: any) {
    console.error('生成分享链接错误:', error)
    return NextResponse.json(
      { message: '服务器错误', error: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/trips/[id]/share - 取消分享
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 获取 cookies
    const cookieStore = await cookies()

    // 创建 Supabase 客户端用于验证用户
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false
      }
    })

    // 尝试从 cookies 中获取 session
    const allCookies = cookieStore.getAll()
    let accessToken = null

    for (const cookie of allCookies) {
      if (cookie.name.includes('auth-token') || cookie.name.includes('access-token')) {
        accessToken = cookie.value
        break
      }
    }

    if (!accessToken) {
      const authHeader = request.headers.get('authorization')
      if (authHeader) {
        accessToken = authHeader.replace('Bearer ', '')
      }
    }

    if (!accessToken) {
      return NextResponse.json({ message: '未登录' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json({ message: '未授权' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const tripId = params.id

    // 验证用户是否拥有该行程
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, user_id')
      .eq('id', tripId)
      .eq('user_id', user.id)
      .single()

    if (tripError || !trip) {
      return NextResponse.json(
        { message: '行程不存在或无权访问' },
        { status: 404 }
      )
    }

    // 取消分享：设置为私密，但保留 token
    const { error: updateError } = await supabase
      .from('trips')
      .update({
        is_public: false
      })
      .eq('id', tripId)

    if (updateError) {
      console.error('取消分享失败:', updateError)
      return NextResponse.json(
        { message: '取消分享失败', error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: '已取消分享' })
  } catch (error: any) {
    console.error('取消分享错误:', error)
    return NextResponse.json(
      { message: '服务器错误', error: error.message },
      { status: 500 }
    )
  }
}
