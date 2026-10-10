import { chromium } from 'playwright'
const b = await chromium.launch()
for (const [label, vp, ua] of [
  ['mobile', {width:390,height:844}, 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36'],
  ['desktop', {width:1920,height:1080}, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36'],
]) {
  const ctx = await b.newContext({ viewport: vp, userAgent: ua, deviceScaleFactor: label==='mobile'?3:1 })
  const p = await ctx.newPage()
  const rows = []
  p.on('response', async r => {
    let h={}; try{h=await r.allHeaders()}catch{}
    rows.push({u:r.url(), t:r.request().resourceType(), cf:h['cf-cache-status']||'-', cc:h['cache-control']||'-', len:Number(h['content-length']||0), enc:h['content-encoding']||'-'})
  })
  await p.goto('https://coral.nerdresolve.com/', {waitUntil:'networkidle', timeout:60000})
  const origin = rows.filter(r=>/coral\.nerdresolve\.com/.test(r.u) && r.cf!=='HIT')
  const bytes = await p.evaluate(()=>performance.getEntriesByType('resource').reduce((s,r)=>s+(r.encodedBodySize||0),0))
  const imgBytes = await p.evaluate(()=>performance.getEntriesByType('resource').filter(r=>/_next\/image|\/fotos\//.test(r.name)).reduce((s,r)=>s+(r.encodedBodySize||0),0))
  console.log('\n##### '+label+'  total='+rows.length+' req, '+bytes+' B encoded, imagens='+imgBytes+' B')
  console.log('requisicoes que NAO vem do cache da Cloudflare (vao ate o servidor via tunel): '+origin.length)
  for (const r of origin) console.log('  ', r.cf.padEnd(12), r.t.padEnd(10), r.enc.padEnd(5), String(r.len).padStart(7), decodeURIComponent(r.u).replace('https://coral.nerdresolve.com','').slice(0,95))
  await ctx.close()
}
await b.close()
