import { chromium } from 'playwright'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport:{width:1440,height:900} })
const p = await ctx.newPage()
const navReqs = []
p.on('request', r => {
  const h = r.headers()
  if (h['rsc'] || h['next-router-prefetch'] || /_rsc=/.test(r.url())) {
    navReqs.push({ u: r.url().replace('https://coral.nerdresolve.com',''), rsc: h['rsc']||'-', pf: h['next-router-prefetch']||'-', method: r.method() })
  }
})
await p.goto('https://coral.nerdresolve.com/', { waitUntil:'networkidle', timeout:60000 })
navReqs.length = 0
// clica num link interno de verdade
const link = await p.$('a[href="/modelos"], a[href="/modelos/"]')
if (link) { await link.click(); await p.waitForLoadState('networkidle') } else { console.log('sem link /modelos; usando /broker'); const l2=await p.$('a[href="/broker"]'); if(l2){await l2.click(); await p.waitForLoadState('networkidle')} }
console.log('URL final:', p.url())
console.log('--- requisicoes RSC durante a navegacao por clique ---')
for (const r of navReqs) console.log(' ', r.method, 'rsc='+r.rsc, 'prefetch='+r.pf, r.u.slice(0,110))
await b.close()
