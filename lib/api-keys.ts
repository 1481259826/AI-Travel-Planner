/**
 * API Key 测试工具函数
 * 用于验证用户提供的 API Key 是否有效
 */

/**
 * 测试 Anthropic API Key 是否有效
 * @param apiKey Anthropic API Key
 * @returns 是否有效
 */
export async function testAnthropicKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      }),
    })

    // 200 表示成功，401/403 表示认证失败
    return response.ok
  } catch (error) {
    console.error('Test Anthropic key error:', error)
    return false
  }
}

/**
 * 测试 DeepSeek API Key 是否有效
 * @param apiKey DeepSeek API Key
 * @returns 是否有效
 */
export async function testDeepSeekKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 10,
      }),
    })

    // 200 表示成功，401/403 表示认证失败
    return response.ok
  } catch (error) {
    console.error('Test DeepSeek key error:', error)
    return false
  }
}

/**
 * 测试高德地图 API Key 是否有效
 * @param apiKey 高德地图 Web 服务 API Key
 * @returns 是否有效
 */
export async function testMapKey(apiKey: string): Promise<boolean> {
  try {
    // 使用 IP 定位接口测试（这个接口比较轻量）
    const response = await fetch(
      `https://restapi.amap.com/v3/ip?key=${apiKey}&ip=114.247.50.2`
    )

    if (!response.ok) return false

    const data = await response.json()

    // status=1 表示成功，status=0 表示失败（如 Key 无效）
    return data.status === '1'
  } catch (error) {
    console.error('Test Map key error:', error)
    return false
  }
}

/**
 * 测试科大讯飞语音 API Key 是否有效
 * @param apiKey 科大讯飞 API Key
 * @returns 是否有效
 */
export async function testVoiceKey(apiKey: string): Promise<boolean> {
  try {
    // 科大讯飞的 API 需要 APPID + API Key + API Secret 组合验证
    // 这里只做基本格式验证，实际验证需要在服务端进行完整的签名流程
    // 简单验证：检查 Key 格式是否符合基本要求（非空且长度合理）
    if (!apiKey || apiKey.length < 16) {
      return false
    }

    // 实际使用时需要调用讯飞 API 进行验证
    // 由于讯飞 API 需要复杂的签名流程，这里暂时返回格式验证结果
    // 建议用户在实际使用时测试语音功能是否正常
    return true
  } catch (error) {
    console.error('Test Voice key error:', error)
    return false
  }
}

/**
 * 测试 Unsplash API Key 是否有效
 * @param apiKey Unsplash Access Key
 * @returns 是否有效
 */
export async function testUnsplashKey(apiKey: string): Promise<boolean> {
  try {
    // 使用一个简单的 API 调用来验证 Key
    const response = await fetch('https://api.unsplash.com/photos/random?count=1', {
      headers: {
        'Authorization': `Client-ID ${apiKey}`,
      },
    })

    // 200 表示成功，401/403 表示认证失败
    return response.ok
  } catch (error) {
    console.error('Test Unsplash key error:', error)
    return false
  }
}

/**
 * 获取用户指定服务的激活 API Key
 * @param userId 用户 ID
 * @param service 服务类型
 * @returns 解密后的 API Key，如果没有则返回 null
 */
export async function getUserApiKey(
  userId: string,
  service: 'anthropic' | 'deepseek' | 'map' | 'voice' | 'unsplash'
): Promise<string | null> {
  try {
    const { supabase } = await import('@/lib/supabase')
    const { decrypt } = await import('@/lib/encryption')

    // 查询用户的激活 API Key
    const { data: apiKey } = await supabase
      .from('api_keys')
      .select('encrypted_key')
      .eq('user_id', userId)
      .eq('service', service)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!apiKey) return null

    // 解密并返回
    return decrypt(apiKey.encrypted_key)
  } catch (error) {
    console.error('Get user API key error:', error)
    return null
  }
}
