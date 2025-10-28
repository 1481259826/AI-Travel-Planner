import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * PUT /api/user/api-keys/[id]
 * 更新 API Key（主要用于切换激活状态）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const { is_active } = await request.json()

    // 验证输入
    if (typeof is_active !== 'boolean') {
      return NextResponse.json({ error: '无效的参数' }, { status: 400 })
    }

    // 更新（只允许更新自己的 key）
    const { data: updatedKey, error: updateError } = await supabase
      .from('api_keys')
      .update({ is_active })
      .eq('id', id)
      .eq('user_id', user.id) // 确保只能更新自己的 key
      .select()
      .single()

    if (updateError) {
      console.error('Update API key error:', updateError)
      return NextResponse.json({ error: '更新失败' }, { status: 500 })
    }

    if (!updatedKey) {
      return NextResponse.json({ error: 'API Key 不存在' }, { status: 404 })
    }

    return NextResponse.json({
      message: '更新成功',
      apiKey: updatedKey
    })
  } catch (error) {
    console.error('Update API key error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/user/api-keys/[id]
 * 删除 API Key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    // 删除（只允许删除自己的 key）
    const { error: deleteError } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // 确保只能删除自己的 key

    if (deleteError) {
      console.error('Delete API key error:', deleteError)
      return NextResponse.json({ error: '删除失败' }, { status: 500 })
    }

    return NextResponse.json({ message: 'API Key 已删除' })
  } catch (error) {
    console.error('Delete API key error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
