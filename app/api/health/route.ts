import { NextResponse } from 'next/server'

/**
 * Health check endpoint
 * Used by useServerStatus hook to detect if server is online
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: Date.now() })
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
