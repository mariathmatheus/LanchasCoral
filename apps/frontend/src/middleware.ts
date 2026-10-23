import { NextRequest, NextResponse } from 'next/server'

/*
 * Cache em memória da lista de IPs bloqueados.
 *
 * O middleware roda no Edge Runtime, sem acesso ao Prisma. A solução é
 * consultar a rota interna /api/blocked-ips (Node.js) e guardar o resultado
 * por 60 s — tempo suficiente para a maioria dos ataques ser travada logo
 * após o bloqueio, sem bater no banco em cada request.
 */
let cachedIps: Set<string> = new Set()
let cacheAt   = 0
const TTL_MS  = 60_000

async function ipsBloqueados(origin: string): Promise<Set<string>> {
  if (Date.now() - cacheAt < TTL_MS) return cachedIps
  try {
    const res  = await fetch(`${origin}/api/blocked-ips`, { cache: 'no-store' })
    const data = await res.json() as string[]
    cachedIps  = new Set(data)
    cacheAt    = Date.now()
  } catch {
    // Em caso de falha, mantém a lista anterior para não derrubar o site.
  }
  return cachedIps
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Não bloqueia arquivos estáticos nem a própria rota da lista.
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/blocked-ips') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|woff2?|css|js|map)$/)
  ) {
    return NextResponse.next()
  }

  const ip = (
    req.headers.get('x-forwarded-for')?.split(',')[0] ??
    req.headers.get('x-real-ip') ??
    '0.0.0.0'
  ).trim()

  const bloqueados = await ipsBloqueados(req.nextUrl.origin)
  if (bloqueados.has(ip)) {
    return new NextResponse('Acesso bloqueado.', { status: 403 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
