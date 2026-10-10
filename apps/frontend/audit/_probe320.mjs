import { chromium } from 'playwright'
const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport:{width:320,height:568}, deviceScaleFactor:2, isMobile:true, hasTouch:true })
const pg = await ctx.newPage()
await pg.addInitScript(() => { try { localStorage.setItem('coral_consentimento', JSON.stringify({estatisticas:true,marketing:true,em:'2026-01-01T00:00:00.000Z',versao:1})) } catch {} })
await pg.goto('https://lanchascoral.com.br/modelos?v='+Date.now(), { waitUntil:'domcontentloaded', timeout:60000 })
await pg.waitForTimeout(2600)
const info = await pg.evaluate(() => {
  const out = { scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }
  const btn = [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label')||'').includes('Abrir menu'))
  if (!btn) return { ...out, err: 'no btn' }
  const chain = []
  let el = btn
  while (el && el !== document.documentElement) {
    const b = el.getBoundingClientRect(); const cs = getComputedStyle(el)
    chain.push({ tag: el.tagName.toLowerCase(), cls: (el.className||'').toString().slice(0,110),
      rect: `${Math.round(b.left)}..${Math.round(b.right)} w=${Math.round(b.width)}`,
      mr: cs.marginRight, pr: cs.paddingRight, ox: cs.overflowX, pos: cs.position })
    el = el.parentElement
  }
  // header bar children
  const bar = btn.closest('.container-page')
  const kids = bar ? [...bar.children].map(c=>{const b=c.getBoundingClientRect();return `${c.tagName.toLowerCase()}.${(c.className||'').toString().slice(0,40)} ${Math.round(b.left)}..${Math.round(b.right)}`}) : []
  return { ...out, chain, kids }
})
console.log(JSON.stringify(info, null, 1))
await nav.close()
