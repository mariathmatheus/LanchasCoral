import { chromium } from 'playwright'
const nav = await chromium.launch()
const slugs = ['coral-29-cabinada','coral-30-cabinada','coral-32-aberta','coral-32-cabinada','coral-33-aberta','coral-33-cabinada']
for (const pass of [1,2]) {
for (const s of slugs) {
  const ctx = await nav.newContext({ viewport:{width:320,height:568}, deviceScaleFactor:2, isMobile:true, hasTouch:true })
  const pg = await ctx.newPage()
  await pg.addInitScript(() => { try { localStorage.setItem('coral_consentimento', JSON.stringify({estatisticas:true,marketing:true,em:'2026-01-01T00:00:00.000Z',versao:1})) } catch {} })
  await pg.goto(`https://lanchascoral.com.br/modelos/${s}?v=${Date.now()}${Math.random()}`, { waitUntil:'domcontentloaded', timeout:60000 })
  await pg.waitForTimeout(3000)
  const r = await pg.evaluate(() => {
    const tela = document.documentElement.clientWidth
    const out = []
    for (const b of document.querySelectorAll('button,a')) {
      const t = (b.getAttribute('aria-label')||b.textContent||'').trim().replace(/\s+/g,' ')
      if (!/menu/i.test(t)) continue
      const r = b.getBoundingClientRect()
      const hdr = b.closest('header')
      const hr = hdr?.getBoundingClientRect()
      out.push({ t, l:Math.round(r.left), rt:Math.round(r.right), w:Math.round(r.width),
        cls:(b.className||'').slice(0,120),
        hdrW: hr?Math.round(hr.width):null, hdrR: hr?Math.round(hr.right):null,
        par:(b.parentElement?.className||'').slice(0,140) })
    }
    return { tela, out, arrasta: document.documentElement.scrollWidth - tela }
  })
  for (const o of r.out) console.log(`p${pass} ${s.padEnd(20)} tela${r.tela} arrasta${r.arrasta}  ${o.l}..${o.rt} w${o.w} ${o.rt>r.tela+1?'FORA':'ok  '} "${o.t}" hdr(w${o.hdrW} r${o.hdrR})`)
  if (pass===1 && r.out.some(o=>o.rt>r.tela+1)) console.log(`     cls=${r.out[0].cls}\n     par=${r.out[0].par}`)
  await ctx.close()
}}
await nav.close()
