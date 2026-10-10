import { chromium } from 'playwright'
const nav = await chromium.launch()

console.log('=== 1. WhatsApp alcancavel na PRIMEIRA visita (sem consentimento) ===')
for (const w of [320, 375, 390, 430]) {
  const ctx = await nav.newContext({ viewport:{width:w,height:800}, deviceScaleFactor:2, isMobile:true, hasTouch:true })
  const pg = await ctx.newPage()
  await pg.goto(`https://lanchascoral.com.br/?a=${Date.now()}${Math.random()}`, { waitUntil:'domcontentloaded', timeout:60000 })
  await pg.waitForTimeout(3000)
  const r = await pg.evaluate(() => {
    const z = document.querySelector('[data-zap]'); if (!z) return { x:'sem zap' }
    const b = z.getBoundingClientRect()
    const el = document.elementFromPoint(Math.round(b.left+b.width/2), Math.round(b.top+b.height/2))
    return { banner: !!document.querySelector('[role="dialog"]'), ok: !!el?.closest('[data-zap]'),
      atinge: el?.closest('[data-zap]') ? 'o WhatsApp' : '<'+el?.tagName.toLowerCase()+'> '+(el?.textContent||'').trim().slice(0,18) }
  })
  console.log(`  ${String(w).padStart(3)}px  banner:${r.banner?'sim':'nao'}  toque atinge ${r.atinge}  ${r.ok?'ok':'*** BLOQUEADO ***'}`)
  await ctx.close()
}

console.log('\n=== 2. Indicador do carrossel ===')
for (const w of [320, 360, 390, 430]) {
  const ctx = await nav.newContext({ viewport:{width:w,height:800}, deviceScaleFactor:2, isMobile:true, hasTouch:true })
  const pg = await ctx.newPage()
  await pg.addInitScript(() => { try { localStorage.setItem('coral_consentimento', JSON.stringify({estatisticas:true,marketing:true,em:'2026-01-01T00:00:00.000Z',versao:1})) } catch {} })
  await pg.goto(`https://lanchascoral.com.br/?b=${Date.now()}${Math.random()}`, { waitUntil:'domcontentloaded', timeout:60000 })
  await pg.waitForTimeout(2600)
  const r = await pg.evaluate(() => {
    const tela = document.documentElement.clientWidth
    const lista = document.querySelector('[role="tablist"]')
    const contador = [...document.querySelectorAll('p[aria-live]')].find(p => /\d+\s*\/\s*\d+/.test(p.textContent||''))
    const setas = [...document.querySelectorAll('button')].filter(b=>/anterior|próxim/i.test(b.getAttribute('aria-label')||''))
      .map(b => { const x=b.getBoundingClientRect(); return { r:Math.round(x.right), ok: x.right<=tela+1 } })
    return { modo: contador ? 'contador: '+(contador.textContent||'').replace(/\s+/g,' ').trim() : (lista?'pontos':'nenhum'),
      setasOk: setas.every(s=>s.ok), setas: setas.map(s=>s.r).join(',') }
  })
  console.log(`  ${String(w).padStart(3)}px  ${r.modo.padEnd(18)} setas terminam em ${r.setas}  ${r.setasOk?'ok':'*** FORA ***'}`)
  await ctx.close()
}

console.log('\n=== 3. Cabecalho em telas estreitas ===')
for (const w of [320, 360, 390]) {
  const ctx = await nav.newContext({ viewport:{width:w,height:800}, deviceScaleFactor:2, isMobile:true, hasTouch:true })
  const pg = await ctx.newPage()
  await pg.addInitScript(() => { try { localStorage.setItem('coral_consentimento', JSON.stringify({estatisticas:true,marketing:true,em:'2026-01-01T00:00:00.000Z',versao:1})) } catch {} })
  await pg.goto(`https://lanchascoral.com.br/?c=${Date.now()}${Math.random()}`, { waitUntil:'domcontentloaded', timeout:60000 })
  await pg.waitForTimeout(2800)
  const r = await pg.evaluate(() => {
    const tela = document.documentElement.clientWidth
    const m = [...document.querySelectorAll('button')].find(b=>/abrir menu/i.test(b.getAttribute('aria-label')||''))
    const mb = m?.getBoundingClientRect()
    // Quantos px do alvo sao realmente tocaveis
    let util = 0
    if (mb) for (let x = Math.round(mb.left); x <= Math.round(mb.right); x++) {
      if (x >= tela) break
      const e = document.elementFromPoint(x, Math.round(mb.top+mb.height/2))
      if (e === m || m.contains(e)) util++
    }
    const lang = document.querySelector('header .ml-auto')?.firstElementChild
    return { dir: mb?Math.round(mb.right):0, util, lang: lang?Math.round(lang.getBoundingClientRect().width):0, tela }
  })
  console.log(`  ${String(w).padStart(3)}px  idioma ${String(r.lang).padStart(3)}px  menu termina ${String(r.dir).padStart(3)} (tela ${r.tela})  alvo util ${r.util}px  ${r.util>=44?'ok':'*** CORTADO ***'}`)
  await ctx.close()
}
await nav.close()
