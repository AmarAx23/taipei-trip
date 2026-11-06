(function(){
'use strict';
const T = window.TRIP, P = window.PHOTOS || {};
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const WD = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];
const WDL = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
const MO = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const ls = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};
const parseD = s => { const [y,m,d] = s.split('-').map(Number); return new Date(Date.UTC(y, m-1, d)); };
const fmtD = s => { const d = parseD(s); return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MO[d.getUTCMonth()]}`; };
function localNow(){
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:T.trip.tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  return {date:`${p.year}-${p.month}-${p.day}`, hm:`${p.hour}:${p.minute}`};
}
let toastT;
function toast(msg, ms=2600){ const t=$('#toast'); t.textContent=msg; t.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>t.hidden=true, ms); }
const photo = key => key && P[key] ? P[key] : null;
const credit = p => p ? `ภาพ: <a href="${esc(p.page)}" target="_blank" rel="noopener">${esc(p.author||'Wikimedia Commons')}</a> · ${esc(p.license)}` : '';
const gmap = (lat, lon, q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || (lat+','+lon))}`;
const amap = (lat, lon, q) => `https://maps.apple.com/?q=${encodeURIComponent(q||'')}&ll=${lat},${lon}`;
const walkUrl = s => { const pts=s.spots.map(x=>`${x.lat},${x.lon}`); const w=pts.slice(0,-1).join('|'); return `https://www.google.com/maps/dir/?api=1&origin=${T.hotel.lat},${T.hotel.lon}&destination=${pts[pts.length-1]}${w?`&waypoints=${encodeURIComponent(w)}`:''}&travelmode=walking`; };
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* ---------- Hero ---------- */
(function hero(){
  const t = T.trip;
  document.title = t.name;
  $('#tripName').innerHTML = `${esc(t.name)}<small>${esc(t.name_local)}</small>`;
  $('#heroEyebrow').textContent = `TAIPEI · ${MO[parseD(t.start).getUTCMonth()]==='ธ.ค.'?'DECEMBER':''} ${parseD(t.start).getUTCFullYear()}`;
  $('#tripWhen').textContent = `${fmtD(t.start)} – ${fmtD(t.end)} ${parseD(t.end).getUTCFullYear()} · ${T.days.length} วัน ${t.nights} คืน · ${t.travelers} คน`;
  const f=T.flights;
  $('#heroChips').innerHTML = [`🏨 ${T.hotel.name}`, `✈️ ${f[0].code.replace(' ','')} · ${f[f.length-1].code.replace(' ','')}`, `🚇 MRT + EasyCard`].map(x=>`<span class="chip">${esc(x)}</span>`).join('');
  const hp = photo(t.hero_photo);
  if (hp){ $('#top').style.setProperty('--hero', `url("${hp.file}")`); $('#heroCredit').innerHTML = credit(hp); }
  $('#shareBtn').onclick = async ()=>{
    const data={title:t.name, text:`แผนเที่ยว${t.city} ${fmtD(t.start)}–${fmtD(t.end)}`, url:location.href.split('#')[0]};
    if (navigator.share){ try{ await navigator.share(data); }catch(e){} return; }
    try{ await navigator.clipboard.writeText(data.url); toast('คัดลอกลิงก์แล้ว'); }catch(e){ toast(data.url, 5000); }
  };
  /* Sky lanterns rising (天燈 · Pingxi/Jiufen) */
  if (!RM){
    const svg = `<svg viewBox="0 0 30 40" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe2a8"/><stop offset="1" stop-color="#f08a3c"/></linearGradient></defs><path d="M5 2h20l4 30H1z" fill="url(#lg)" opacity=".95"/><path class="glow" d="M8 30h14l-2 6h-10z" fill="#ffd27a"/><path d="M15 6v20M8 4l-2 26M22 4l2 26" stroke="#c4622a" stroke-width=".8" opacity=".55"/></svg>`;
    const box=$('#skylan'), H=$('#top').offsetHeight+80;
    box.innerHTML = Array.from({length:7},(_,k)=>`<span class="skl" style="left:${[8,22,40,58,72,86,50][k]}%;--w:${[18,14,22,12,20,15,10][k]}px;--d:${[13,17,15,19,14,18,21][k]}s;--dl:-${[2,9,5,13,0,7,11][k]}s;--h:${H}px">${svg}</span>`).join('');
  }
})();

/* ---------- Fireworks over Taipei 101 (tap the title) ---------- */
(function fireworks(){
  const c=$('#fw'), title=$('#tripName'); if(!c.getContext) return;
  const x=c.getContext('2d'); let parts=[], raf=0;
  const size=()=>{ c.width=c.offsetWidth*devicePixelRatio; c.height=c.offsetHeight*devicePixelRatio; };
  const cols=['#ffd34d','#ff6b6b','#7fd3ff','#ffffff','#ffb547','#c3a6ff'];
  function burst(px,py){
    const col=cols[Math.random()*cols.length|0], n=46;
    for(let i=0;i<n;i++){ const a=i/n*Math.PI*2, s=1.6+Math.random()*2.6; parts.push({x:px,y:py,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:1,c:col}); }
    if(!raf) raf=requestAnimationFrame(step);
  }
  function step(){
    x.clearRect(0,0,c.width,c.height); x.globalCompositeOperation='lighter';
    parts.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=.045; p.vx*=.985; p.vy*=.985; p.l-=.013;
      x.globalAlpha=Math.max(p.l,0); x.fillStyle=p.c; x.beginPath(); x.arc(p.x*devicePixelRatio,p.y*devicePixelRatio,2*devicePixelRatio,0,7); x.fill(); });
    parts=parts.filter(p=>p.l>0);
    raf = parts.length ? requestAnimationFrame(step) : 0;
    if(!raf) x.clearRect(0,0,c.width,c.height);
  }
  const show=()=>{ if(RM) return; size(); const w=c.offsetWidth, h=c.offsetHeight; [0,260,520].forEach((d,k)=>setTimeout(()=>burst(w*(.25+Math.random()*.5), h*(.15+Math.random()*.3)),d)); };
  title.addEventListener('click',show);
  addEventListener('resize',()=>{ if(raf) size(); });
})();

/* ---------- Theme switch ---------- */
(function theme(){
  const root=document.documentElement, b=$('#themeBtn');
  const dark=()=>{ const a=root.getAttribute('data-theme'); return a ? a==='dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
  const sync=()=>{ b.classList.toggle('on', dark()); b.setAttribute('aria-label', dark()?'สลับเป็นโหมดสว่าง':'สลับเป็นโหมดมืด'); document.querySelector('meta[name=theme-color]').content = dark()?'#0D1013':'#F4F1EA'; };
  b.addEventListener('click',()=>{ const n = dark() ? 'light' : 'dark'; root.setAttribute('data-theme', n); try{localStorage.setItem('theme', n);}catch(e){} sync(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', sync);
  sync();
})();

/* ---------- Flip-board countdown ---------- */
(function countdown(){
  const out = T.flights[0], back = T.flights[T.flights.length-1];
  const tOut = Date.parse(out.dep_iso), tBack = Date.parse(back.dep_iso);
  const clock = $('#clock'), label = $('#countLabel');
  const units = [['วัน',2],['ชม.',2],['นาที',2],['วินาที',2]];
  const cell = '<div class="fc"><i class="t">0</i><i class="b">0</i><i class="ft">0</i><i class="fb">0</i></div>';
  clock.innerHTML = units.map(u=>`<div class="unit"><div class="digits">${cell.repeat(u[1])}</div><span>${u[0]}</span></div>`).join('');
  const cells = $$('.unit', clock).map(u=>$$('.fc', u));
  const setFc = (el, v, anim) => {
    const [t,b,ft,fb] = el.children; const old = t.textContent; if (old === v) return;
    if (!anim || RM){ t.textContent=b.textContent=ft.textContent=fb.textContent=v; return; }
    ft.textContent = old; fb.textContent = v; t.textContent = v; b.textContent = old;
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
    setTimeout(()=>{ b.textContent = v; ft.textContent = v; el.classList.remove('go'); }, 650);
  };
  let first = true;
  function tick(){
    const now = Date.now(); let target;
    if (now < tOut){ target=tOut; label.textContent = ''; }
    else if (now < tBack){ target=tBack; label.textContent = `🎉 อยู่ไทเปแล้ว! เหลือเวลาก่อนบินกลับ ${back.code}`; }
    else { label.textContent = '✨ จบทริปแล้ว ขอบคุณที่เที่ยวด้วยกัน'; clock.hidden = true; return; }
    const s = Math.max(0, Math.floor((target-now)/1000));
    let v = [Math.floor(s/86400), Math.floor(s%86400/3600), Math.floor(s%3600/60), s%60];
    if (v[0] > 99) units[0][1] = 3;
    v.forEach((n,i)=>{ const str=String(n).padStart(2,'0').slice(-2); cells[i].forEach((el,k)=>setFc(el, str[k], !first)); });
    first = false;
  }
  tick(); setInterval(tick, 1000);
})();

/* ---------- Weather (Open-Meteo) ---------- */
const WMO = c => c===0?['☀️','แดด']:c<=2?['🌤️','เมฆบ้าง']:c===3?['☁️','เมฆมาก']:c<=48?['🌫️','หมอก']:c<=57?['🌦️','ฝนปรอย']:c<=67?['🌧️','ฝน']:c<=77?['🌨️','หิมะ']:c<=82?['🌧️','ฝนเป็นช่วง']:['⛈️','พายุ'];
(async function weather(){
  const box=$('#wx'), sub=$('#wxSub');
  const tripDates = new Set(T.days.map(d=>d.date));
  const render = (data, stamp) => {
    const d = data.daily; const today = localNow().date;
    const toStart = Math.round((parseD(T.trip.start) - parseD(today))/86400000);
    const C = T.trip.climate || {hi:20, lo:15, rain:40};
    // Always the trip days only: real forecast once it reaches them, monthly average before that
    box.innerHTML = T.days.map((day,k)=>{
      const i = d ? d.time.indexOf(day.date) : -1;
      if (i < 0) return `<div style="--i:${k}"><div class="d">${fmtD(day.date)}</div><div class="i" title="ค่าเฉลี่ย">🌥️</div><div class="t">~${C.hi}° <small>${C.lo}°</small></div><div class="r">☔ ~${C.rain}%</div></div>`;
      const [ic,txt]=WMO(d.weather_code[i]);
      return `<div class="trip" style="--i:${k}"><div class="d">${fmtD(day.date)}</div><div class="i" title="${txt}">${ic}</div><div class="t">${Math.round(d.temperature_2m_max[i])}° <small>${Math.round(d.temperature_2m_min[i])}°</small></div><div class="r">☔ ${d.precipitation_probability_max[i] ?? '–'}%</div></div>`;
    }).join('');
    const got = d && T.days.some(day=>d.time.includes(day.date));
    sub.innerHTML = got ? `พยากรณ์จริง${stamp?`<small>อัปเดต ${esc(stamp)}</small>`:''}` : `ค่าเฉลี่ยเดือนธันวาคม<small>${toStart>0?`พยากรณ์จริงจะขึ้นเองเมื่อเหลือ ≤16 วัน (อีก ${toStart} วัน)`:''}</small>`;
  };
  const cached = ls.get('wx', null);
  render(cached ? cached.data : {daily:null}, cached ? cached.stamp + ' · ข้อมูลเก่า' : '');
  try{
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${T.trip.lat}&longitude=${T.trip.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=${encodeURIComponent(T.trip.tz)}&forecast_days=16`;
    const r = await fetch(u); if(!r.ok) throw 0; const data = await r.json();
    const stamp = new Date().toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'});
    ls.set('wx',{data,stamp}); render(data, stamp);
  }catch(e){}
})();

/* ---------- Boarding passes ---------- */
(function tickets(){
  const bag = T.baggage;
  $('#tickets').innerHTML = T.flights.map((f,i)=>{
    const back = i>0;
    const bagHtml = bag ? `<ul><li><b>ถือขึ้นเครื่อง</b>${esc(bag.carry)}</li><li><b>โหลด</b>${esc(bag.checked)}</li></ul>` : `<ul><li><b>กระเป๋า</b>ยังไม่ได้ใส่ข้อมูล</li><li><b>ผู้โดยสาร</b>${f.passengers} คน</li><li><b>เวลา</b>${esc(f.duration)}</li></ul>`;
    return `<div class="passw rv${back?' back':''}" tabindex="0" role="button" aria-pressed="false" aria-label="ตั๋ว ${esc(f.code)} แตะเพื่อพลิก">
      <div class="pass-in">
        <div class="pass">
          <div class="pass-main">
            <div class="pass-top"><span>${esc(f.dir)} · ${WDL[parseD(f.date).getUTCDay()]} ${fmtD(f.date).split(' ').slice(1).join(' ')} ${parseD(f.date).getUTCFullYear()}</span></div>
            <div class="route">
              <div class="port"><b>${esc(f.from)}</b><small>${esc(f.from_name.split(' ')[0])}</small><span class="tm">${esc(f.dep)}</span></div>
              <div><div class="arc"><svg preserveAspectRatio="none"><path/></svg><span class="plane" aria-hidden="true">✈</span></div><div class="dur">${esc(f.duration)}</div></div>
              <div class="port r"><b>${esc(f.to)}</b><small>${esc(f.to_name.split(' ')[0])}</small><span class="tm">${esc(f.arr)}</span></div>
            </div>
            <div class="links" onclick="event.stopPropagation()">
              <a href="https://www.flightradar24.com/data/flights/${esc(f.code.replace(/\s/g,'').toLowerCase())}" target="_blank" rel="noopener">🛩️ FR24</a>
              <a href="https://www.flightaware.com/live/flight/${esc(f.icao)}" target="_blank" rel="noopener">🛩️ FlightAware</a>
              <button type="button" data-notes="${esc(f.code.replace(/\s/g,''))}">📱 iPhone</button>
            </div>
          </div>
          <div class="stub">FLIGHT<b>${esc(f.code.replace(/\s/g,''))}</b>${esc(f.airline)}<div class="flip-hint">แตะพลิก ↻</div></div>
        </div>
        <div class="pass-back"><div class="pbk"><b style="font-family:var(--head);color:var(--navy)">🧳 กฎกระเป๋า · ${esc(f.code)}</b>${bagHtml}<small>แตะอีกครั้งเพื่อกลับ</small></div></div>
      </div></div>`;
  }).join('');
  $$('.passw').forEach(w=>{
    const flip=()=>{ w.classList.toggle('on'); w.setAttribute('aria-pressed', w.classList.contains('on')); };
    w.addEventListener('click',flip); w.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); flip(); } });
  });
  const arcs=()=>$$('.arc').forEach(a=>{ const w=a.clientWidth, h=a.clientHeight; const d=`M4 ${h-6} Q ${w/2} ${-h*0.55} ${w-4} ${h-6}`; a.querySelector('path').setAttribute('d',d); a.querySelector('svg').setAttribute('viewBox',`0 0 ${w} ${h}`); a.querySelector('.plane').style.setProperty('--op',`path("${d}")`); a.querySelector('.plane').style.offsetPath=`path("${d}")`; });
  arcs(); addEventListener('resize',arcs);
  $$('[data-notes]').forEach(b=>b.addEventListener('click', async e=>{
    e.stopPropagation(); const code=b.dataset.notes;
    try{ await navigator.clipboard.writeText(code); }catch(err){}
    toast(`คัดลอก ${code} แล้ว · ในแอปโน้ต วางแล้วแตะค้างที่เลขเที่ยวบินเพื่อดู Preview Flight`, 6000);
    setTimeout(()=>{ location.href='mobilenotes://'; }, 500);
  }));
  const h=T.hotel;
  $('#hotelCard').innerHTML=`<div class="card hotel rv"><h3 style="color:var(--navy)">🏨 ${esc(h.name)} <span class="tag gold">ที่พัก</span></h3><div class="zh" lang="zh-TW" style="color:var(--muted)">${esc(h.name_local)}</div>
    <dl><dt>ที่อยู่</dt><dd>${esc(h.address)}<br><span lang="zh-TW">${esc(h.address_local)}</span></dd><dt>โทร</dt><dd style="user-select:all">${esc(h.phone)}</dd><dt>เวลา</dt><dd>เช็คอิน ${esc(h.checkin)} · เช็คเอาท์ ${esc(h.checkout)}</dd></dl>
    <div class="links"><a href="${gmap(h.lat,h.lon,h.address_local)}" target="_blank" rel="noopener">📍 Google Maps</a><a href="${amap(h.lat,h.lon,h.name_local)}" target="_blank" rel="noopener">🍎 Apple Maps</a><button type="button" data-drv="hotel">🚕 การ์ดคนขับ</button></div></div>`;
})();

/* ---------- Plan ---------- */
const maps = {};
(function plan(){
  const tabs=$('#tabs'), days=$('#days'), H=T.hotel;
  const today = localNow().date;
  tabs.innerHTML = T.days.map((d,i)=>{ const dt=parseD(d.date); return `<button class="dtab${d.date===today?' today':''}" role="tab" type="button" aria-selected="${i===0}" aria-controls="day${i+1}" data-i="${i}"><b>${i+1}</b>${WD[dt.getUTCDay()]} ${dt.getUTCDate()}</button>`; }).join('');
  const icons=['🏯','🐟','🏮','🚡'];
  days.innerHTML = T.days.map((d,i)=>{
    const dt=parseD(d.date);
    const rs = d.stops.filter(s=>!s.skip_route);
    const pts = rs.map(s=>`${s.lat},${s.lon}`);
    const dest = pts[pts.length-1];
    const wps = pts.slice(0,-1).slice(0,9).join('|');
    const gdir = `https://www.google.com/maps/dir/?api=1&origin=${H.lat},${H.lon}&destination=${dest}${wps?`&waypoints=${encodeURIComponent(wps)}`:''}&travelmode=transit`;
    let n=0;
    const legs = d.stops.map((s,j)=> s.skip_route ? '' : `<button type="button" class="mleg${s.hotel?' h':''}" data-day="${i}" data-j="${j}"><b>${s.hotel?'🏨':(++n)}</b>${esc(s.name.replace(/^โรงแรม: /,''))}</button>`).join('');
    return `<article class="day" id="day${i+1}" role="tabpanel" aria-label="วันที่ ${i+1}" data-i="${i}">
      <div class="dayhead"><div class="num">${i+1}</div><div class="dh-txt"><h3>${esc(d.title)}</h3><p>${WDL[dt.getUTCDay()]} ${dt.getUTCDate()} ${MO[dt.getUTCMonth()]} ${dt.getUTCFullYear()}${d.note?` · ${esc(d.note)}`:''}</p></div><div class="dicon" aria-hidden="true">${icons[i%icons.length]}</div></div>
      <figure class="dmap" id="dmap${i}">
        <div class="lmap" id="map${i}" aria-label="แผนที่วันที่ ${i+1}"></div>
        <div class="schematic" id="sch${i}"></div>
        <button type="button" class="mfs" data-full="${i}">⛶ เต็มจอ</button>
        <figcaption><div class="mlegs">${legs}</div>
          <div class="mall"><a href="${gdir}" target="_blank" rel="noopener">🗺️ เปิดทุกจุดใน Google Maps</a></div>
          <small>เส้นทางเริ่มจากที่พัก · แผนที่ส่วนที่เคยเปิดตอนมีเน็ตจะจำไว้ใช้ออฟไลน์ ถ้าโหลดไม่ได้จะแสดงแผนผังแทน</small></figcaption>
      </figure>
      ${d.transport?`<details class="tdrop"><summary>${esc(d.transport.summary)}</summary><p>${esc(d.transport.intro)}</p>${d.transport.options.map(o=>`<div class="topt"><b>${esc(o.title)}</b> <span class="tag gold">${esc(o.tag)}</span><ul>${o.bullets.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}<p class="fine">${esc(d.transport.footnote)}</p></details>`:''}
      ${d.rain?`<div class="note rain"><span>☔</span><span><b>แผนสำรองฝนตก</b> · ${esc(d.rain)}</span></div>`:''}
      <ol class="tl">${(()=>{ let k=0; return d.stops.map((s,j)=>{
        const p = s.skip_photo ? null : photo(s.photo); const num = (s.hotel||s.skip_route)?'':++k;
        return `<li class="ev${s.hotel?' hotel':''}" data-day="${i}" data-j="${j}" data-time="${esc(s.time)}">
          <time>${esc(s.time)}</time><span class="dot"></span>
          <div class="evb">
            ${p?`<div class="ph cur"><img class="thumb" loading="lazy" decoding="async" src="${esc(p.file)}" alt="${esc(s.name)}" data-cap="${esc(s.name)}" data-key="${esc(s.photo)}" width="${p.w}" height="${p.h}"><span class="credit">${credit(p)}</span></div>`:''}
            <h3>${esc(s.name)}${s.hotel?' <span class="tag gold">ที่พัก</span>':''}</h3>
            <div class="zh" lang="zh-TW">${esc(s.local)}</div>
            ${s.note?`<p>${esc(s.note)}</p>`:''}
            ${s.spots?.length?`<ol class="spots">${s.spots.map((x,m)=>`<li><a href="${gmap(x.lat,x.lon,x.local)}" target="_blank" rel="noopener"><b>${String.fromCharCode(65+m)}</b><span><span class="sn">${esc(x.name)}</span><span class="zh" lang="zh-TW">${esc(x.local)}${x.hours?` · ${esc(x.hours)}`:''}</span></span><i>📍</i></a></li>`).join('')}</ol>
            <div class="links"><a class="walk" href="${walkUrl(s)}" target="_blank" rel="noopener">🚶 เส้นทางเดินผ่านทุกจุด</a></div>`:''}
            ${(s.hours||s.warn)?`<div class="tags">${s.hours?`<span class="tag gold">🕒 ${esc(s.hours)}</span>`:''}${s.warn?`<span class="tag">⚠️ ${esc(s.warn)}</span>`:''}</div>`:''}
            <div class="links"><a href="${s.gurl||gmap(s.lat,s.lon,s.q||s.local)}" target="_blank" rel="noopener">📍 Google Maps</a><a href="${amap(s.lat,s.lon,s.local)}" target="_blank" rel="noopener">🍎 Apple</a><button type="button" data-drv="${i}-${j}">🚕 การ์ดคนขับ</button></div>
          </div></li>`; }).join(''); })()}</ol>
    </article>`;
  }).join('');
  $('#extraPlaces').innerHTML = T.extras?.length ? `<h3>📌 ปักหมุดไว้แต่ยังไม่อยู่ในแผน</h3>` + T.extras.map(x=>`<div class="ex rv"><div><b>${esc(x.name)}</b> <span class="zh" lang="zh-TW">${esc(x.local)}</span><small>${esc(x.note)}</small></div><a class="pill" href="${gmap(x.lat,x.lon,x.local)}" target="_blank" rel="noopener">📍 แผนที่</a></div>`).join('') : '';

  const tabEls = $$('.dtab', tabs);
  let cur = 0;
  /* Fit the card to the day being shown, so a short day leaves no empty space */
  const fit = () => { const pane=days.children[cur]; if(pane) days.style.height = pane.offsetHeight + 'px'; };
  if ('ResizeObserver' in window){ const ro=new ResizeObserver(()=>fit()); [...days.children].forEach(p=>ro.observe(p)); }
  const sel = i => { cur=i; fit(); tabEls.forEach((t,k)=>t.setAttribute('aria-selected', String(k===i))); tabEls[i].scrollIntoView({block:'nearest',inline:'center',behavior:RM?'auto':'smooth'}); initMap(i); progress(); };
  window.goDay = (i, toMap=true, smooth=true) => {
    days.scrollTo({left: i*days.clientWidth, behavior: (smooth && !RM)?'smooth':'auto'}); sel(i);
    if (toMap) $('#dmap'+i).scrollIntoView({behavior: RM?'auto':'smooth', block:'center'});
  };
  tabEls.forEach(t=>t.addEventListener('click',()=>goDay(+t.dataset.i)));
  let st; days.addEventListener('scroll',()=>{ clearTimeout(st); st=setTimeout(()=>{ const i=Math.round(days.scrollLeft/days.clientWidth); if(i!==cur) sel(i); },90); },{passive:true});
  addEventListener('resize',()=>{ days.scrollLeft = cur*days.clientWidth; Object.values(maps).forEach(m=>m.map&&m.map.invalidateSize()); });

  /* Schematic fallback */
  T.days.forEach((d,i)=>{
    const s=d.stops.filter(x=>!x.skip_route);
    const lats=s.map(x=>x.lat), lons=s.map(x=>x.lon);
    const [a,b,c,e]=[Math.min(...lats),Math.max(...lats),Math.min(...lons),Math.max(...lons)];
    const W=600,Hh=300,pad=40;
    const sx=v=>pad+(e===c?.5:(v-c)/(e-c))*(W-2*pad), sy=v=>Hh-pad-(b===a?.5:(v-a)/(b-a))*(Hh-2*pad);
    const pts=s.map(x=>[sx(x.lon),sy(x.lat)]); let k=0;
    $('#sch'+i).innerHTML = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="แผนผังลำดับจุดวันที่ ${i+1}"><polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="var(--red)" stroke-width="2.5" stroke-dasharray="6 5"/>${pts.map((p,m)=>{ const h=s[m].hotel; const lab=h?'🏨':++k; return `<g><circle cx="${p[0]}" cy="${p[1]}" r="12" fill="${h?'var(--navy-2)':'var(--red)'}" stroke="var(--card)" stroke-width="2.5"/><text x="${p[0]}" y="${p[1]+4.5}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">${lab}</text></g>`; }).join('')}<text x="12" y="20" font-size="12" fill="var(--muted)">แผนผังคร่าว ๆ (โหลดแผนที่ไม่ได้)</text></svg>`;
  });

  function initMap(i){
    if (maps[i]) { setTimeout(()=>maps[i].map&&maps[i].map.invalidateSize(),60); return; }
    const box=$('#dmap'+i);
    if (!window.L){ box.classList.add('fallback'); maps[i]={}; return; }
    const d=T.days[i];
    const map=L.map('map'+i,{zoomControl:true,scrollWheelZoom:false});
    let loaded=0;
    const tl=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);
    tl.on('tileload',()=>{ loaded++; box.classList.remove('fallback'); });
    setTimeout(()=>{ if(!loaded) box.classList.add('fallback'); },6000);
    const line=[[H.lat,H.lon]];
    d.stops.forEach(s=>{ if(s.skip_route) return; if(!(s.hotel && line.length===1)) line.push([s.lat,s.lon]); });
    const pl=L.polyline(line,{color:css('--red')||'#B0242E',weight:3,opacity:.9,className:'route'}).addTo(map);
    const markers={};
    const mk=(lat,lon,html,cls,delay)=>L.marker([lat,lon],{icon:L.divIcon({className:'',html:`<div class="pin ${cls}" style="--pd:${delay}s">${html}</div>`,iconSize:[26,26],iconAnchor:[13,13]})}).addTo(map);
    mk(H.lat,H.lon,'🏨','h',0).bindPopup(`<b>${esc(H.name)}</b><br>${esc(H.name_local)}`);
    let k=0;
    d.stops.forEach((s,j)=>{ if(s.hotel||s.skip_route) return; k++;
      markers[j]=mk(s.lat,s.lon,k,'',.15+k*.12).bindPopup(`<b>${esc(s.time)} ${esc(s.name)}</b><br><span lang="zh-TW">${esc(s.local)}</span>`); });
    d.stops.forEach(s=>s.spots?.forEach((x,m)=>{ mk(x.lat,x.lon,String.fromCharCode(65+m),'sp',.5+m*.08).bindPopup(`<b>${String.fromCharCode(65+m)} · ${esc(x.name)}</b><br><span lang="zh-TW">${esc(x.local)}</span><br><a href="${gmap(x.lat,x.lon,x.local)}" target="_blank" rel="noopener">เปิดใน Google Maps</a>`); }));
    map.fitBounds(L.latLngBounds(line).pad(0.15));
    requestAnimationFrame(()=>{ const path=pl.getElement(); if(path && path.getTotalLength && !RM){ const len=Math.ceil(path.getTotalLength()); path.style.setProperty('--len',len); path.classList.add('route-draw'); path.addEventListener('animationend',()=>path.classList.add('done'),{once:true}); } else if(path) path.classList.add('route-draw','done'); });
    maps[i]={map,markers};
  }
  /* Legend chip → fly to pin + flash the event */
  days.addEventListener('click',e=>{
    const b=e.target.closest('.mleg'); if(!b) return;
    const i=+b.dataset.day, j=+b.dataset.j, s=T.days[i].stops[j], m=maps[i];
    if(m?.map){ m.map.flyTo([s.lat,s.lon],15,{duration:RM?0:.8}); m.markers?.[j]?.openPopup(); }
    const ev=$(`.ev[data-day="${i}"][data-j="${j}"]`); if(ev){ ev.classList.remove('flash'); void ev.offsetWidth; ev.classList.add('flash'); }
  });
  $$('[data-full]').forEach(b=>b.addEventListener('click',()=>{
    const i=+b.dataset.full, box=$('#dmap'+i); const on=!box.classList.contains('fs');
    box.classList.toggle('fs',on); document.documentElement.classList.toggle('mfs-open',on); b.textContent=on?'✕ ปิด':'⛶ เต็มจอ';
    setTimeout(()=>maps[i]?.map?.invalidateSize(),80);
  }));
  addEventListener('keydown',e=>{ if(e.key==='Escape'){ const f=$('.dmap.fs'); if(f) f.querySelector('[data-full]').click(); } });

  /* Timeline fill as you scroll */
  function progress(){
    const tl=$(`#day${cur+1} .tl`); if(!tl) return;
    const r=tl.getBoundingClientRect(), mid=innerHeight*.55;
    const p=Math.max(0,Math.min(1,(mid-r.top)/r.height)); tl.style.setProperty('--tlp',p.toFixed(3));
    $$('.ev',tl).forEach(ev=>{ const er=ev.getBoundingClientRect(); ev.classList.toggle('lit', er.top+10 < mid); });
  }
  addEventListener('scroll',()=>requestAnimationFrame(progress),{passive:true});

  /* Today mode */
  function todayMode(){
    const n=localNow(); const i=T.days.findIndex(d=>d.date===n.date);
    $$('.ev').forEach(el=>el.classList.remove('next','past'));
    const ban=$('#todayBanner');
    if (i<0){ ban.hidden=true; return -1; }
    const evs=$$(`.ev[data-day="${i}"]`);
    const nxt=evs.find(el=>el.dataset.time>=n.hm);
    evs.forEach(el=>{ if(el.dataset.time<n.hm && el!==nxt) el.classList.add('past'); });
    if (nxt){ nxt.classList.add('next'); const s=T.days[i].stops[+nxt.dataset.j];
      ban.innerHTML=`<span>📍 <b>วันนี้ วันที่ ${i+1}</b> · ถัดไป ${esc(s.time)} ${esc(s.name)}</span><button type="button" class="btn" id="goNext" style="padding:6px 12px;font-size:12.5px">ไปดู</button>`;
      $('#goNext').onclick=()=>{ goDay(i,false); setTimeout(()=>{ nxt.scrollIntoView({behavior:RM?'auto':'smooth',block:'center'}); nxt.classList.remove('flash'); void nxt.offsetWidth; nxt.classList.add('flash'); },RM?0:350); };
    } else ban.innerHTML=`<span>📍 <b>วันนี้ วันที่ ${i+1}</b> · จบกิจกรรมของวันนี้แล้ว</span>`;
    ban.hidden=false; return i;
  }
  const ti=todayMode();
  requestAnimationFrame(()=>{ if(ti>=0) goDay(ti,false,false); else { initMap(0); progress(); } });
  setInterval(todayMode,60000);
})();

/* ---------- Currency ---------- */
(async function money(){
  const a=$('#fxThb'), b=$('#fxTwd'), note=$('#fxNote'), q=$('#fxQuick');
  let rate = ls.get('fx',null), last=a;
  const draw=()=>{ if(!rate) return; const r=rate.rate;
    if (last===b) a.value = b.value===''?'':(+b.value / r).toFixed(0);
    else b.value = a.value===''?'':(+a.value * r).toFixed(0);
    note.textContent = `1 บาท ≈ ${r.toFixed(3)} TWD · 1 TWD ≈ ${(1/r).toFixed(3)} บาท · เรท ${rate.date}${rate.stale?' (ข้อมูลเก่า)':''}`;
    q.innerHTML=[50,100,200,500,1000].map(v=>`<span>NT$${v} ≈ ${(v/r).toFixed(0)} ฿</span>`).join('');
  };
  a.addEventListener('input',()=>{last=a;draw();}); b.addEventListener('input',()=>{last=b;draw();});
  $('#fxSwap').onclick=()=>{ (last===a?b:a).focus(); };
  if (rate){ rate.stale=true; draw(); }
  try{ const r=await fetch('https://open.er-api.com/v6/latest/THB'); const j=await r.json(); if(j.result!=='success') throw 0;
    rate={rate:j.rates.TWD, date:new Date(j.time_last_update_unix*1000).toLocaleDateString('th-TH',{dateStyle:'medium'})}; ls.set('fx',rate); draw();
    note.insertAdjacentHTML('beforeend',' · <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener">Rates By Exchange Rate API</a>');
  }catch(e){ if(!rate) note.textContent='โหลดเรทไม่ได้ (ต้องต่อเน็ตครั้งแรก)'; }
})();

/* ---------- Tips ---------- */
(function tips(){
  $('#tips').innerHTML=(T.tips||[]).map(x=>`<li class="rv"><span class="ic">${x.icon}</span><div class="tx"><b>${esc(x.title)}</b><small>${esc(x.text)}</small>${x.link?`<div class="links"><a href="${esc(x.link)}" target="_blank" rel="noopener">${esc(x.linkText||'เปิดลิงก์')} ↗</a></div>`:''}</div></li>`).join('');
})();

/* ---------- Checklist ---------- */
(function checklist(){
  const ul=$('#checklist');
  let custom=ls.get('chk_custom',[]), done=ls.get('chk_done',{});
  const draw=()=>{
    const items=[...T.checklist.map(t=>({t,c:false})), ...custom.map(t=>({t,c:true}))];
    ul.innerHTML=items.map((it,k)=>`<li><label><input type="checkbox" id="chk${k}" data-t="${esc(it.t)}" ${done[it.t]?'checked':''}><span>${esc(it.t)}</span>${it.c?`<button type="button" class="del" data-del="${esc(it.t)}" aria-label="ลบ">✕</button>`:''}</label></li>`).join('');
    const n=items.filter(it=>done[it.t]).length;
    $('#checkSub').textContent=`${n}/${items.length}`;
    $('#checkBar').style.width=(items.length?n/items.length*100:0)+'%';
  };
  ul.addEventListener('change',e=>{ const t=e.target.dataset.t; if(t==null) return; if(e.target.checked) done[t]=1; else delete done[t]; ls.set('chk_done',done);
    const n=Object.keys(done).length, all=T.checklist.length+custom.length; $('#checkSub').textContent=`${n}/${all}`; $('#checkBar').style.width=(n/all*100)+'%'; if(n===all) toast('🎉 เตรียมของครบแล้ว!'); });
  ul.addEventListener('click',e=>{ const d=e.target.dataset?.del; if(!d) return; e.preventDefault(); custom=custom.filter(x=>x!==d); delete done[d]; ls.set('chk_custom',custom); ls.set('chk_done',done); draw(); });
  $('#addCheck').addEventListener('submit',e=>{ e.preventDefault(); const v=$('#addCheckInput').value.trim(); if(!v) return; if(!custom.includes(v)&&!T.checklist.includes(v)) custom.push(v); ls.set('chk_custom',custom); $('#addCheckInput').value=''; draw(); });
  draw();
})();

/* ---------- Speech ---------- */
let voices=[]; const loadVoices=()=>{ voices=window.speechSynthesis?.getVoices?.()||[]; };
if ('speechSynthesis' in window){ loadVoices(); speechSynthesis.onvoiceschanged=loadVoices; }
function speak(text, lang, onend){
  if(!('speechSynthesis' in window)){ toast('เครื่องนี้อ่านออกเสียงไม่ได้'); return; }
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text); u.lang=lang; u.rate=.9;
  const v=voices.find(v=>v.lang.replace('_','-')===lang)||voices.find(v=>v.lang.startsWith(lang.slice(0,2)));
  if(v) u.voice=v; if(onend) u.onend=u.onerror=onend; speechSynthesis.speak(u);
}
function bigShow(text, sub){ $('#bigText').textContent=text; $('#bigSub').textContent=sub||''; $('#bigView').hidden=false; document.documentElement.classList.add('mfs-open'); }

/* ---------- Help ---------- */
(function help(){
  const LL=T.trip.lang_local, H=T.hotel, hp=T.hospital;
  const opts=[{key:'hotel', name:'🏨 ที่พัก: '+H.name, local:H.name_local, addr:H.address_local, sub:`${H.name} · ${H.address}`}];
  const seen=new Map([[H.name_local,0]]);
  T.days.forEach((d,i)=>d.stops.forEach((s,j)=>{ const key=`${i}-${j}`; if(seen.has(s.local)){ opts[seen.get(s.local)].alias=(opts[seen.get(s.local)].alias||[]).concat(key); return; } seen.set(s.local,opts.length); opts.push({key, name:`วันที่ ${i+1}: ${s.name}`, local:s.local, addr:'', sub:s.name}); }));
  T.extras?.forEach(x=>{ if(!seen.has(x.local)){ seen.set(x.local,opts.length); opts.push({key:'x'+x.local, name:x.name, local:x.local, addr:'', sub:x.name}); } });
  opts.push({key:'hospital', name:'🏥 โรงพยาบาล: '+hp.name, local:hp.name_local, addr:hp.address_local, sub:`${hp.name} · ${hp.address}`});
  const sel=$('#driverSel');
  sel.innerHTML=opts.map((o,k)=>`<option value="${k}">${esc(o.name)}</option>`).join('');
  const show=()=>{ const o=opts[+sel.value]; $('#driverBig').innerHTML=`${esc(o.local)}${o.addr?`<small>${esc(o.addr)}</small>`:''}`; $('#driverSub').textContent=o.sub; };
  sel.onchange=show; show();
  $('#driverSpeak').onclick=()=>{ const o=opts[+sel.value]; speak(`你好，請帶我去${o.local}${o.addr?'，地址是'+o.addr:''}，謝謝`, LL); };
  $('#driverFull').onclick=()=>{ const o=opts[+sel.value]; bigShow(`請帶我去\n${o.local}${o.addr?'\n'+o.addr:''}`, `ช่วยพาไปที่นี่ · ${o.sub}`); };
  document.addEventListener('click',e=>{ const b=e.target.closest('[data-drv]'); if(!b) return; e.stopPropagation(); const key=b.dataset.drv;
    const k=opts.findIndex(o=>o.key===key || o.alias?.includes(key) || (key==='hotel'&&o.key==='hotel')); if(k<0) return;
    sel.value=k; show(); $('#driver').scrollIntoView({behavior:RM?'auto':'smooth',block:'center'}); });

  $('#phrases').innerHTML=T.phrases.map((p,k)=>`<li class="rv" data-say="${k}"><div class="tx"><span class="zh" lang="zh-TW">${esc(p.zh)}</span><span class="th">${esc(p.th)} · ${esc(p.py)}</span></div><button type="button" class="say" aria-label="ฟังเสียง ${esc(p.th)}">🔊</button></li>`).join('');
  $('#phrases').addEventListener('click',e=>{ const li=e.target.closest('[data-say]'); if(!li) return; li.classList.add('speaking'); speak(T.phrases[li.dataset.say].zh, LL, ()=>li.classList.remove('speaking')); setTimeout(()=>li.classList.remove('speaking'),4000); });

  const ic={'ตำรวจ':'👮','รถพยาบาล / ดับเพลิง':'🚑'};
  const c=T.consulate;
  $('#emerg').innerHTML=T.emergency.map(e=>`<li class="rv"><span class="ic">${ic[e.label]||'🌐'}</span><div class="tx"><b>${esc(e.label)}</b><span class="num">${esc(e.num)}</span></div></li>`).join('')
    + `<li class="rv"><span class="ic">🇹🇭</span><div class="tx"><b>${esc(c.name)}</b><small lang="zh-TW">${esc(c.name_local)} · ${esc(c.address)}</small><span class="num">${esc(c.phone)}</span><small>${esc(c.note)} · <a href="${esc(c.url)}" target="_blank" rel="noopener">เว็บไซต์</a></small></div></li>`
    + `<li class="rv"><span class="ic">🏥</span><div class="tx"><b>${esc(hp.name)}</b><small lang="zh-TW">${esc(hp.name_local)}</small><small>${esc(hp.address)} · ${esc(hp.note)}</small><div class="links"><a href="${gmap(hp.lat,hp.lon,hp.address_local)}" target="_blank" rel="noopener">📍 แผนที่</a><button type="button" data-drv="hospital">🚕 การ์ดคนขับ</button></div></div></li>`;

  /* Translator with chat bubbles */
  let dir='th';
  const dirBtn=$('#trDir'), inp=$('#trIn'), log=$('#trLog'), status=$('#trStatus');
  const setDir=d=>{ dir=d; dirBtn.textContent = d==='th'?'ไทย → 繁體中文':'繁體中文 → ไทย'; inp.placeholder = d==='th'?'หรือพิมพ์ไทยตรงนี้':'或在這裡輸入中文'; };
  dirBtn.onclick=()=>setDir(dir==='th'?'zh':'th');
  async function tr(q, sl, tl){
    try{ const r=await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(q)}`); if(!r.ok) throw 0; const j=await r.json(); return j[0].map(x=>x[0]).join(''); }catch(e){}
    const r=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${sl}|${tl}`); const j=await r.json(); return j.responseData.translatedText;
  }
  async function translate(text){
    const q=(text ?? inp.value).trim(); if(!q) return;
    const me = dir==='th', sl=me?'th':LL, tl=me?LL:'th';
    status.textContent='กำลังแปล…';
    try{
      const out=await tr(q,sl,tl); status.textContent='';
      const bub=document.createElement('div'); bub.className='tb '+(me?'me':'them');
      bub.innerHTML=`<div class="src">${esc(q)}</div><div class="dst" lang="${tl==='th'?'th':'zh-TW'}">${esc(out)}</div><div class="acts"><span class="pill">🔊 ฟัง</span><span class="pill" data-big>⛶ ตัวใหญ่</span></div>`;
      bub.onclick=e=>{ if(e.target.closest('[data-big]')) bigShow(out,q); else speak(out, tl==='th'?'th-TH':LL); };
      log.appendChild(bub); bub.scrollIntoView({block:'nearest',behavior:RM?'auto':'smooth'});
      if(me) speak(out, LL);
      if(text==null) inp.value='';
    }catch(e){ status.textContent='แปลไม่ได้ ต้องต่ออินเทอร์เน็ต'; }
  }
  $('#trGo').onclick=()=>translate();
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); translate(); } });
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  function mic(btn, lang, d){
    if(!SR){ btn.disabled=true; return; }
    btn.onclick=()=>{
      const r=new SR(); r.lang=lang; r.interimResults=true; r.continuous=false;
      setDir(d); btn.classList.add('rec'); status.textContent = d==='th'?'กำลังฟัง… พูดภาษาไทยได้เลย':'正在聆聽… 請說中文';
      let said='';
      r.onresult=e=>{ said=[...e.results].map(x=>x[0].transcript).join(''); status.textContent='“'+said+'”'; };
      r.onerror=e=>{ status.textContent = e.error==='not-allowed'?'ยังไม่ได้อนุญาตไมค์ ถ้าเปิดจากไอคอนหน้าจอใช้ไม่ได้ ให้เปิดใน Safari':'ฟังไม่ชัด ลองใหม่อีกครั้ง'; };
      r.onend=()=>{ btn.classList.remove('rec'); if(said.trim()) translate(said); };
      try{ r.start(); }catch(e){ btn.classList.remove('rec'); }
    };
  }
  mic($('#trMicTh'),'th-TH','th'); mic($('#trMicZh'),LL,'zh');
  if(!SR) $('#trNote').textContent='เครื่องนี้ใช้ไมค์ในเว็บไม่ได้ ใช้ปุ่มไมค์บนคีย์บอร์ดพิมพ์แทนได้ · การแปลต้องต่อเน็ต';
})();

/* ---------- Overlays ---------- */
function closeAll(){ ['#bigView','#lightbox','#sumSheet'].forEach(s=>$(s).hidden=true); document.documentElement.classList.remove('mfs-open'); }
document.addEventListener('click',e=>{ if(e.target.closest('[data-close]') || e.target.id==='lightbox') closeAll(); });
addEventListener('keydown',e=>{ if(e.key==='Escape') closeAll(); });
/* Lightbox grows from the thumbnail's own position */
document.addEventListener('click',e=>{
  const im=e.target.closest('img.thumb'); if(!im) return;
  const p=P[im.dataset.key]; const lb=$('#lightbox'), big=$('#lbImg');
  big.src=p?.full||im.src; big.alt=im.alt; $('#lbCap').innerHTML=`${esc(im.dataset.cap)} · ${credit(p)}`;
  lb.hidden=false; document.documentElement.classList.add('mfs-open');
  if(RM || !big.animate) return;
  const from=im.getBoundingClientRect();
  requestAnimationFrame(()=>{ const to=big.getBoundingClientRect(); if(!to.width) return;
    big.animate([{transformOrigin:'top left',transform:`translate(${from.left-to.left}px,${from.top-to.top}px) scale(${from.width/to.width},${from.height/to.height})`},{transformOrigin:'top left',transform:'none'}],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'});
    lb.animate([{backgroundColor:'rgba(0,0,0,0)'},{backgroundColor:'rgba(0,0,0,.92)'}],{duration:420});
  });
});

/* ---------- Summary images (canvas) ---------- */
(function summary(){
  let useLocal=false;
  $$('#sumLang button').forEach(b=>b.onclick=()=>{ useLocal=b.dataset.l==='zh'; $$('#sumLang button').forEach(x=>x.classList.toggle('on',x===b)); build(); });
  $('#sumBtn').onclick=()=>{ $('#sumSheet').hidden=false; document.documentElement.classList.add('mfs-open'); build(); };
  function wrap(ctx,text,maxW){ const out=[]; let line=''; for(const ch of [...text]){ if(ctx.measureText(line+ch).width>maxW && line){ out.push(line); line=ch; } else line+=ch; } if(line) out.push(line); return out; }
  const imgCache={};
  const loadImg=src=>imgCache[src]||(imgCache[src]=new Promise(r=>{ const i=new Image(); i.onload=()=>r(i); i.onerror=()=>r(null); i.src=src; }));
  async function draw(kind, i){
    try{ await Promise.all(['600 64px Kanit','700 64px Kanit','400 30px "Noto Sans Thai"','600 30px "Noto Sans Thai"'].map(f=>document.fonts.load(f))); }catch(e){}
    const W=1080,H=1350,c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d');
    const zh='"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif';
    const nm=s=>useLocal?s.local:s.name;
    x.fillStyle='#F4F1EA'; x.fillRect(0,0,W,H);
    // header band with photo
    const key = kind==='day' ? (T.days[i].stops.find(s=>s.photo&&!s.hotel&&!s.skip_route&&P[s.photo])?.photo) : T.trip.hero_photo;
    const im = key && P[key] ? await loadImg(P[key].file) : null;
    x.save(); x.beginPath(); x.roundRect?x.roundRect(40,40,W-80,440,40):x.rect(40,40,W-80,440); x.clip();
    x.fillStyle='#0F3A54'; x.fillRect(40,40,W-80,440);
    if(im){ const s=Math.max((W-80)/im.width,440/im.height); x.drawImage(im,40+((W-80)-im.width*s)/2,40+(440-im.height*s)/2,im.width*s,im.height*s); }
    const g=x.createLinearGradient(0,40,0,480); g.addColorStop(0,'rgba(10,38,58,.55)'); g.addColorStop(1,'rgba(110,24,32,.88)'); x.fillStyle=g; x.fillRect(40,40,W-80,440);
    x.restore();
    x.fillStyle='#EBCB82'; x.font='600 28px "Noto Sans Thai"'; x.fillText(`${T.trip.name_local} · ${T.trip.name}`,90,110);
    if(kind==='day'){
      const d=T.days[i], dt=parseD(d.date);
      x.fillStyle='#fff'; x.font='700 110px Kanit'; x.fillText(`วันที่ ${i+1}`,90,300);
      x.font='600 40px Kanit'; x.fillText(`${WDL[dt.getUTCDay()]} ${dt.getUTCDate()} ${MO[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`,90,370);
      x.font=useLocal?`600 34px ${zh}`:'600 34px "Noto Sans Thai"'; x.fillStyle='rgba(255,255,255,.88)';
      x.fillText(wrap(x,useLocal?d.stops.filter(s=>!s.hotel&&!s.skip_route).slice(0,3).map(s=>s.local).join(' · '):d.title,880)[0],90,430);
      let y=570; const step=Math.min(100,(H-640)/d.stops.length);
      x.strokeStyle='#E8E1D2'; x.lineWidth=4; x.beginPath(); x.moveTo(210,y); x.lineTo(210,y+step*(d.stops.length-1)); x.stroke();
      let k=0;
      d.stops.forEach(s=>{
        x.fillStyle='#6B7680'; x.font='600 30px Kanit'; x.textAlign='right'; x.fillText(s.time,175,y+10); x.textAlign='left';
        const lab = s.hotel?'H':(s.skip_route?'✈':String(++k));
        x.fillStyle=s.hotel?'#1D5C82':'#B0242E'; x.beginPath(); x.arc(210,y,22,0,7); x.fill();
        x.fillStyle='#fff'; x.font='600 22px Kanit'; x.textAlign='center'; x.fillText(lab,210,y+8); x.textAlign='left';
        x.fillStyle='#1B2730'; x.font=useLocal?`600 36px ${zh}`:'600 36px Kanit'; x.fillText(wrap(x,nm(s),780)[0],256,y+13);
        y+=step;
      });
    } else {
      x.fillStyle='#fff'; x.font='700 104px Kanit'; x.fillText(useLocal?T.trip.name_local:T.trip.name,90,300);
      x.font='500 36px "Noto Sans Thai"'; x.fillStyle='rgba(255,255,255,.9)'; x.fillText(`${fmtD(T.trip.start)} – ${fmtD(T.trip.end)} · ${T.days.length} วัน ${T.trip.nights} คืน · ${T.trip.travelers} คน`,90,370);
      let y=570;
      T.days.forEach((d,k)=>{
        x.fillStyle='#0F3A54'; x.beginPath(); x.roundRect?x.roundRect(80,y-48,72,72,20):x.rect(80,y-48,72,72); x.fill();
        x.fillStyle='#fff'; x.font='600 40px Kanit'; x.textAlign='center'; x.fillText(String(k+1),116,y+2); x.textAlign='left';
        x.fillStyle='#0F3A54'; x.font='600 36px Kanit'; x.fillText(`${fmtD(d.date)} · ${useLocal?'':d.title}`,180,y-6);
        x.fillStyle='#1B2730'; x.font=useLocal?`500 30px ${zh}`:'400 30px "Noto Sans Thai"';
        const lines=wrap(x,d.stops.filter(s=>!s.hotel&&!s.skip_route).map(nm).join(' → '),820).slice(0,2);
        lines.forEach((l,m)=>x.fillText(l,180,y+38+m*40));
        y+=96+lines.length*40;
      });
      const f=T.flights; x.fillStyle='#B0242E'; x.font='600 30px Kanit';
      x.fillText(`✈ ${f[0].code} ${f[0].from}→${f[0].to} ${f[0].dep}   ·   ${f[f.length-1].code} ${f[f.length-1].from}→${f[f.length-1].to} ${f[f.length-1].dep}`,80,H-90);
    }
    x.fillStyle='#B5872F'; x.font='400 22px "Noto Sans Thai"'; x.fillText(location.host+location.pathname,80,H-40);
    return c;
  }
  async function build(){
    const grid=$('#sumGrid'); grid.innerHTML='<p class="fine">กำลังวาด…</p>';
    const items=[['ภาพรวมทริป','all',0],...T.days.map((d,i)=>[`วันที่ ${i+1}`,'day',i])];
    const figs=[];
    for(const [label,kind,i] of items){
      const c=await draw(kind,i); const blob=await new Promise(r=>c.toBlob(r,'image/png'));
      figs.push({label,url:URL.createObjectURL(blob),blob,name:`taipei-${kind==='all'?'overview':'day'+(i+1)}${useLocal?'-zh':''}.png`});
    }
    grid.innerHTML=figs.map((f,k)=>`<figure style="animation-delay:${k*60}ms"><img src="${f.url}" alt="${esc(f.label)}"><figcaption>${esc(f.label)}</figcaption><div class="links"><a href="${f.url}" download="${f.name}">💾 บันทึก</a><button type="button" data-share="${k}">📤 แชร์</button></div></figure>`).join('');
    grid.onclick=async e=>{ const k=e.target.closest('[data-share]')?.dataset.share; if(k==null) return; const f=figs[k];
      const file=new File([f.blob],f.name,{type:'image/png'});
      if(navigator.canShare?.({files:[file]})){ try{ await navigator.share({files:[file],title:f.label}); }catch(err){} } else toast('เครื่องนี้แชร์ไฟล์ไม่ได้ ใช้ปุ่มบันทึกแทน'); };
  }
})();

/* ---------- Print sheet (A4 cards) ---------- */
(function print(){
  const f=T.flights, h=T.hotel;
  $('#printSheet').innerHTML=`<div class="ps-cover"><small>TAIPEI · ${parseD(T.trip.start).getUTCFullYear()}</small><h1>${esc(T.trip.name)} <span style="font-size:13pt;opacity:.75">${esc(T.trip.name_local)}</span></h1><p>${fmtD(T.trip.start)} – ${fmtD(T.trip.end)} · ${T.trip.travelers} คน · ${f.map(x=>`${esc(x.code)} ${esc(x.from)}→${esc(x.to)} ${fmtD(x.date)} ${esc(x.dep)}`).join(' · ')}</p></div>
  <div class="ps-grid">
    ${T.days.map((d,i)=>`<div class="ps-card"><h2><span>วันที่ ${i+1}</span> · ${fmtD(d.date)} · ${esc(d.title)}</h2><ol>${d.stops.map(s=>`<li><b>${esc(s.time)}</b> ${esc(s.name)} <span class="z">${esc(s.local)}</span>${s.hours?` · ${esc(s.hours)}`:''}</li>`).join('')}</ol></div>`).join('')}
    <div class="ps-card"><h2>🏨 ที่พัก</h2>${esc(h.name)} <span class="z">${esc(h.name_local)}</span><br><span class="z">${esc(h.address_local)}</span><br>${esc(h.address)}<br>โทร ${esc(h.phone)} · เช็คอิน ${esc(h.checkin)} · เช็คเอาท์ ${esc(h.checkout)}</div>
    <div class="ps-card"><h2>🆘 ฉุกเฉิน</h2>${T.emergency.map(e=>`${esc(e.label)} <b>${esc(e.num)}</b>`).join('<br>')}<br>${esc(T.consulate.name)} ${esc(T.consulate.phone)}<br>${esc(T.hospital.name)}<br><span class="z">${esc(T.hospital.address_local)}</span></div>
  </div>`;
  $('#printBtn').onclick=()=>window.print();
})();

/* ---------- Credits ---------- */
(function credits(){
  $('#creditList').innerHTML=Object.entries(P).map(([k,p])=>`<li>${esc(p.label||k)}: <a href="${esc(p.page)}" target="_blank" rel="noopener">${esc(p.title||'Wikimedia Commons')}</a> · ${esc(p.author||'ไม่ระบุ')} · ${p.licurl?`<a href="${esc(p.licurl)}" target="_blank" rel="noopener">${esc(p.license)}</a>`:esc(p.license)}</li>`).join('') || '<li>ยังไม่มีรูป</li>';
  $('#creditCount').textContent=`· ${Object.keys(P).length} รูป`;
  $('#verLine').textContent=`เวอร์ชัน ${window.APP_VERSION}`;
})();

/* ---------- Bottom nav: highlight the section in view ---------- */
(function bnav(){
  const links=$$('#bnav a'); const secs=links.map(a=>$('#'+a.dataset.sec));
  const upd=()=>{ const y=innerHeight*.35; let on=0; secs.forEach((s,k)=>{ if(s.getBoundingClientRect().top<y) on=k; }); links.forEach((a,k)=>a.classList.toggle('on',k===on && secs[0].getBoundingClientRect().top<innerHeight*.6)); };
  addEventListener('scroll',()=>requestAnimationFrame(upd),{passive:true}); upd();
})();

/* ---------- Reveal on scroll + photo curtains ---------- */
(function reveal(){
  if(RM || !('IntersectionObserver' in window)){ $$('.ph.cur').forEach(p=>p.classList.add('open')); return; }
  const io=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.remove('pre'); e.target.classList.add('open'); io.unobserve(e.target); } }),{rootMargin:'0px 0px -10% 0px'});
  $$('.card, .rv, .ph.cur, .ex, .phrases li, .emerg li').forEach(el=>{ const r=el.getBoundingClientRect(); if(el.classList.contains('ph')){ io.observe(el); return; } if(r.top>innerHeight){ el.classList.add('rv','pre'); io.observe(el); } });
})();

/* ---------- Service worker + update prompt ---------- */
(function sw(){
  if(!('serviceWorker' in navigator) || location.protocol==='file:') return;
  let refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{ if(refreshing) return; refreshing=true; location.reload(); });
  navigator.serviceWorker.register('sw.js').then(reg=>{
    const offer=w=>{ const b=$('#updateBtn'); b.hidden=false; b.onclick=()=>{ b.textContent='กำลังอัปเดต…'; w.postMessage('skipWaiting'); }; };
    if(reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound',()=>{ const w=reg.installing; w.addEventListener('statechange',()=>{ if(w.state==='installed' && navigator.serviceWorker.controller) offer(w); }); });
    setInterval(()=>reg.update().catch(()=>{}), 30*60*1000);
    document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') reg.update().catch(()=>{}); });
  }).catch(()=>{});
})();
})();
