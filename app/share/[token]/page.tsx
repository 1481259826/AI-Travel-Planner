import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import SharePageClient from './SharePageClient'

// 服务端获取数据
async function getTripData(token: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: trip, error } = await supabase
      .from('trips')
      .select(`
        *,
        profiles:user_id (
          name,
          email
        )
      `)
      .eq('share_token', token)
      .eq('is_public', true)
      .single()

    if (error || !trip) {
      console.error('Get trip error:', error)
      return null
    }

    // 获取费用记录
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', trip.id)
      .order('date', { ascending: false })

    return {
      ...trip,
      expenses: expenses || []
    }
  } catch (error) {
    console.error('Error fetching trip:', error)
    return null
  }
}

// 生成元数据用于 SEO 和社交分享
export async function generateMetadata({
  params
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  try {
    const { token } = await params
    const trip = await getTripData(token)

    if (!trip) {
      return {
        title: '行程不存在 | AI 旅行规划师'
      }
    }

    const title = `${trip.destination} 旅行计划 - ${trip.start_date} 至 ${trip.end_date}`
    const description = trip.itinerary?.summary || `探索 ${trip.destination} 的精彩旅程，${trip.travelers} 人同行，为期 ${Math.ceil(
      (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1} 天。`

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        locale: 'zh_CN',
        images: [
          {
            url: `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${baseUrl}/share/${token}`,
            width: 400,
            height: 400,
            alt: title
          }
        ]
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description
      }
    }
  } catch (error) {
    return {
      title: '行程分享 | AI 旅行规划师'
    }
  }
}

export default async function SharePage({
  params
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const trip = await getTripData(token)

  if (!trip) {
    notFound()
  }

  return <SharePageClient trip={trip} />
}
