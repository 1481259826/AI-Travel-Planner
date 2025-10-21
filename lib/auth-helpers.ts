import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Server-side auth helper
export async function getAuthUser(request: NextRequest) {
  try {
    // Get the authorization token from cookies or header
    const cookieHeader = request.headers.get('cookie')
    const authHeader = request.headers.get('authorization')

    // Create Supabase client with anon key for client-side auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })

    // Try to get session from cookie
    if (cookieHeader) {
      const accessToken = cookieHeader
        .split(';')
        .find((c) => c.trim().startsWith('sb-access-token='))
        ?.split('=')[1]

      if (accessToken) {
        const { data: { user }, error } = await supabase.auth.getUser(accessToken)
        if (!error && user) {
          return { user, error: null }
        }
      }
    }

    // Try to get session from Authorization header
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (!error && user) {
        return { user, error: null }
      }
    }

    return { user: null, error: new Error('Unauthorized') }
  } catch (error) {
    return { user: null, error: error as Error }
  }
}
