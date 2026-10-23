import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Retorna a lista de IPs bloqueados. Consumida só pelo middleware (interno).
export async function GET() {
  const rows = await prisma.blockedIp.findMany({ select: { ip: true } })
  return NextResponse.json(rows.map((r) => r.ip), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
