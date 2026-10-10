import { chromium } from 'playwright'
const nav = await chromium.launch()
for (const w of [320, 390, 430]) {
  const ctx = await nav.newContext({ viewport:{width:w,height:932}, deviceScaleFactor:2, isMobile:true, hasTouch:true })
  const pg = await ctx.newPage()
  await pg.addInitScript(() => { try { localStorage.setItem('coral_consentimento', JSON.stringify({estatisticas:true,marketing:true,em:'2026-01-01T00:00:00.000Z',versao:1})) } catch {} })
  await pg.goto(`https://lanchascoral.com.br/broker?marca=Coral&ano=2026&tipo=jetski&l=${Date.now()}`, { waitUntil:'domcontentloaded', timeout:60000 })
  await pg.waitForTimeout(2400)
  const abrir = await pg.$('button:has-text("Filtrar")')
  if (abrir) { await abrir.click(); await pg.waitForTimeout(800) }
  const r = await pg.evaluate(() => {
    const lf = [...document.querySelectorAll('a,button')].find(e=>/limpar/i.test(e.getAttribute('aria-label')||''))
    if (!lf) return { sem: true }
    const b = lf.getBoundingClientRect()
    const e = document.elementFromPoint(Math.round(b.left+b.width/2), Math.round(b.top+b.height/2))
    return { pos: `${Math.round(b.left)},${Math.round(b.top)}..${Math.round(b.right)},${Math.round(b.bottom)}`,
      ok: !!(e===lf||lf.contains(e)), atinge: e?.closest('[data-zap]')?'WhatsApp':'<'+e?.tagName.toLowerCase()+'>' }
  })
  if (r.sem) { console.log(`${w}px: "Limpar filtros" nao aparece`); await ctx.close(); continue }
  console.log(`${w}px  ${r.pos}  toque atinge ${r.atinge}  ${r.ok?'ok':'*** ROUBADO ***'}`)
  await ctx.close()
}
await nav.close()
