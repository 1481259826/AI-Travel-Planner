import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth-helpers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// PUT /api/expenses/[id] - 更新费用记录
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证用户登录
    const { user, error: authError } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json({ message: '未授权' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { id: expenseId } = await params;

    // 获取请求数据
    const body = await request.json();
    const { category, amount, description, date } = body;

    // 验证必填字段
    if (!category && !amount && !description && !date) {
      return NextResponse.json(
        { message: '至少提供一个要更新的字段' },
        { status: 400 }
      );
    }

    // 验证类别（如果提供）
    if (category) {
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
    }

    // 验证金额（如果提供）
    if (amount !== undefined && parseFloat(amount) <= 0) {
      return NextResponse.json(
        { message: '金额必须大于0' },
        { status: 400 }
      );
    }

    // 验证用户是否拥有该费用记录（通过 trip）
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('trip_id')
      .eq('id', expenseId)
      .single();

    if (expenseError || !expense) {
      return NextResponse.json(
        { message: '费用记录不存在' },
        { status: 404 }
      );
    }

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id')
      .eq('id', expense.trip_id)
      .eq('user_id', user.id)
      .single();

    if (tripError || !trip) {
      return NextResponse.json(
        { message: '无权修改此费用记录' },
        { status: 403 }
      );
    }

    // 构建更新对象
    const updateData: any = {};
    if (category) updateData.category = category;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (description !== undefined) updateData.description = description || null;
    if (date) updateData.date = date;

    // 更新费用记录
    const { data: updatedExpense, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', expenseId)
      .select()
      .single();

    if (error) {
      console.error('更新费用记录失败:', error);
      return NextResponse.json(
        { message: '更新费用记录失败', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ expense: updatedExpense });
  } catch (error: any) {
    console.error('更新费用记录错误:', error);
    return NextResponse.json(
      { message: '服务器错误', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/expenses/[id] - 删除费用记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证用户登录
    const { user, error: authError } = await getAuthUser(request);

    if (authError || !user) {
      return NextResponse.json({ message: '未授权' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { id: expenseId } = await params;

    // 验证用户是否拥有该费用记录（通过 trip）
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('trip_id')
      .eq('id', expenseId)
      .single();

    if (expenseError || !expense) {
      return NextResponse.json(
        { message: '费用记录不存在' },
        { status: 404 }
      );
    }

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id')
      .eq('id', expense.trip_id)
      .eq('user_id', user.id)
      .single();

    if (tripError || !trip) {
      return NextResponse.json(
        { message: '无权删除此费用记录' },
        { status: 403 }
      );
    }

    // 删除费用记录
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) {
      console.error('删除费用记录失败:', error);
      return NextResponse.json(
        { message: '删除费用记录失败', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: '删除成功' });
  } catch (error: any) {
    console.error('删除费用记录错误:', error);
    return NextResponse.json(
      { message: '服务器错误', error: error.message },
      { status: 500 }
    );
  }
}
