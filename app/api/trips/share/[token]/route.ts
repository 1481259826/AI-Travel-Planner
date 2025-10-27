import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// GET /api/trips/share/[token] - 通过 token 获取公开的行程
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { token: shareToken } = await params

    if (!shareToken) {
      return NextResponse.json(
        { message: '缺少分享 token' },
        { status: 400 }
      )
    }

    // 查询公开的行程
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select(`
        id,
        destination,
        origin,
        start_date,
        end_date,
        budget,
        travelers,
        preferences,
        itinerary,
        status,
        created_at,
        updated_at,
        share_token,
        is_public,
        profiles:user_id (
          name,
          email
        )
      `)
      .eq('share_token', shareToken)
      .eq('is_public', true)
      .single()

    if (tripError || !trip) {
      return NextResponse.json(
        { message: '行程不存在或未公开分享' },
        { status: 404 }
      )
    }

    // 获取该行程的费用记录（如果有）
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', trip.id)
      .order('date', { ascending: false })

    // 返回行程信息（脱敏处理用户邮箱）
    const profile = Array.isArray(trip.profiles) ? trip.profiles[0] : trip.profiles
    const response = {
      ...trip,
      profiles: profile ? {
        name: profile.name || '匿名用户'
        // 不返回邮箱以保护隐私
      } : null,
      expenses: expenses || []
    }

    return NextResponse.json({ trip: response })
  } catch (error: any) {
    console.error('获取公开行程错误:', error)
    return NextResponse.json(
      { message: '服务器错误', error: error.message },
      { status: 500 }
    )
  }
}
