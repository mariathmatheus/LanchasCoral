import { chromium } from 'playwright'
const URL = process.argv[2] || 'https://coral.nerdresolve.com/'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:3, userAgent:'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36' })
const p = await ctx.newPage()
const reqs = []
p.on('response', async r => {
  const t = r.request().timing()
  let len = 0
  try { len = Number((await r.allHeaders())['content-length'] || 0) } catch {}
  reqs.push({ url:r.url(), status:r.status(), type:r.request().resourceType(), len,
    enc:(await r.allHeaders().catch(()=>({})))['content-encoding']||'', cf:(await r.allHeaders().catch(()=>({})))['cf-cache-status']||'',
    ttfb: t ? (t.responseStart - t.requestStart) : null, end: t? t.responseEnd : null })
})
const t0 = Date.now()
await p.goto(URL, { waitUntil:'load', timeout:60000 })
const loadMs = Date.now()-t0
await p.waitForTimeout(3500)
const m = await p.evaluate(() => new Promise(res=>{
  const out={}
  const nav = performance.getEntriesByType('navigation')[0]
  out.ttfb = nav.responseStart; out.domContentLoaded = nav.domContentLoadedEventEnd; out.load = nav.loadEventEnd
  out.transferSize = nav.transferSize; out.encodedBodySize = nav.encodedBodySize; out.decodedBodySize = nav.decodedBodySize
  const lcps = performance.getEntriesByType('largest-contentful-paint')
  out.lcp = lcps.length ? lcps[lcps.length-1].startTime : null
  out.lcpUrl = lcps.length ? lcps[lcps.length-1].url : null
  out.fcp = (performance.getEntriesByName('first-contentful-paint')[0]||{}).startTime
  const rs = performance.getEntriesByType("resource")
  out.totalEncoded = rs.reduce((s,r)=>s+(r.encodedBodySize||0),0)
  out.count = rs.length
  rs.sort((a,b)=>(b.encodedBodySize||0)-(a.encodedBodySize||0))
  out.heaviest = rs.slice(0,12).map(r=>[r.name.replace(/^https:\/\/coral\.nerdresolve\.com/,''), r.encodedBodySize, Math.round(r.responseStart-r.startTime), Math.round(r.responseEnd)])
  rs.sort((a,b)=>b.responseEnd-a.responseEnd)
  out.slowest = rs.slice(0,8).map(r=>[r.name.replace(/^https:\/\/coral\.nerdresolve\.com/,'').slice(0,90), r.encodedBodySize, Math.round(r.responseEnd-r.startTime), Math.round(r.responseEnd)])
  res(out)
}))
console.log(JSON.stringify({ url:URL, loadMs, ...m }, null, 1))
console.log('--- heroes requested ---')
for (const r of reqs.filter(r=>/hero-home/.test(r.url))) console.log(r.status, r.cf, r.len, decodeURIComponent(r.url).replace(/^https:\/\/coral\.nerdresolve\.com/,''))
console.log('--- cf-cache-status tally ---')
const tally={}; for(const r of reqs){ const k=r.type+':'+(r.cf||'-')+':'+(r.enc||'none'); tally[k]=(tally[k]||0)+1 }
console.log(tally)
await b.close()
