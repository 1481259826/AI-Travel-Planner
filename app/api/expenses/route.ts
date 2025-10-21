import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth-helpers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// GET /api/expenses?trip_id=xxx - 获取费用列表
export async function GET(request: NextRequest) {
  try {
    // 验证用户登录
    const { user, error: authError } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json({ message: '未授权' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 获取 trip_id 参数
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get('trip_id');

    if (!tripId) {
      return NextResponse.json({ message: '缺少 trip_id 参数' }, { status: 400 });
    }

    // 验证用户是否拥有该行程
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id')
      .eq('id', tripId)
      .eq('user_id', user.id)
      .single();

    if (tripError || !trip) {
      return NextResponse.json(
        { message: '行程不存在或无权访问' },
        { status: 404 }
      );
    }

    // 获取费用列表
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', tripId)
      .order('date', { ascending: false });

    if (error) {
      console.error('获取费用列表失败:', error);
      return NextResponse.json(
        { message: '获取费用列表失败', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ expenses: expenses || [] });
  } catch (error: any) {
    console.error('获取费用列表错误:', error);
    return NextResponse.json(
      { message: '服务器错误', error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/expenses - 创建费用记录
export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const { user, error: authError } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json({ message: '未授权' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 获取请求数据
    const body = await request.json();
    const { trip_id, category, amount, description, date } = body;

    // 验证必填字段
    if (!trip_id || !category || !amount || !date) {
      return NextResponse.json(
        { message: '缺少必填字段' },
        { status: 400 }
      );
    }

    // 验证类别
    const validCategories = [
      'accommodation',
      'transportation',
      'food',
      'attractions',
      'shopping',
      'other',
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { message: '无效的费用类别' },
        { status: 400 }
      );
    }

    // 验证金额
    if (parseFloat(amount) <= 0) {
      return NextResponse.json(
        { message: '金额必须大于0' },
        { status: 400 }
      );
    }

    // 验证用户是否拥有该行程
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id')
      .eq('id', trip_id)
      .eq('user_id', user.id)
      .single();

    if (tripError || !trip) {
      return NextResponse.json(
        { message: '行程不存在或无权访问' },
        { status: 404 }
      );
    }

    // 创建费用记录
    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        trip_id,
        category,
        amount: parseFloat(amount),
        description: description || null,
        date,
      })
      .select()
      .single();

    if (error) {
      console.error('创建费用记录失败:', error);
      return NextResponse.json(
        { message: '创建费用记录失败', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error: any) {
    console.error('创建费用记录错误:', error);
    return NextResponse.json(
      { message: '服务器错误', error: error.message },
      { status: 500 }
    );
  }
}
