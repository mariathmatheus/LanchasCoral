import { chromium } from 'playwright'
const nav = await chromium.launch()
for (const w of [320, 360, 375]) {
const ctx = await nav.newContext({ viewport:{width:w,height:700}, deviceScaleFactor:2, isMobile:true, hasTouch:true })
const pg = await ctx.newPage()
await pg.addInitScript(() => { try { localStorage.setItem('coral_consentimento', JSON.stringify({estatisticas:true,marketing:true,em:'2026-01-01T00:00:00.000Z',versao:1})) } catch {} })
await pg.goto('https://lanchascoral.com.br/modelos?v='+Date.now()+Math.random(), { waitUntil:'domcontentloaded', timeout:60000 })
await pg.waitForTimeout(2400)
const r = await pg.evaluate(() => {
  const c = document.querySelector('header .container-page')
  const cs = getComputedStyle(c)
  const btn = [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label')||'').includes('Abrir menu'))
  const bb = btn.getBoundingClientRect()
  const gut = getComputedStyle(document.documentElement).getPropertyValue('--layout-gutter')
  return { gutterVar: gut.trim(), padRight: cs.paddingRight, contRight: Math.round(c.getBoundingClientRect().right),
    btn: `${Math.round(bb.left)}..${Math.round(bb.right)}`, docScroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }
})
console.log(w, JSON.stringify(r))
await ctx.close()
}
await nav.close()
