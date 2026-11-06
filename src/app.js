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
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:T.trip.tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
  return {date:`${parts.year}-${parts.month}-${parts.day}`, hm:`${parts.hour}:${parts.minute}`};
}
let toastT;
function toast(msg, ms=2600){ const t=$('#toast'); t.textContent=msg; t.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>t.hidden=true, ms); }
function photo(key){ return key && P[key] ? P[key] : null; }
function credit(p){ return p ? `${p.label?esc(p.label)+' · ':''}ภาพ: <a href="${esc(p.page)}" target="_blank" rel="noopener">${esc(p.author||'Wikimedia Commons')}</a> · ${esc(p.license)}` : ''; }
const gmap = (lat, lon, q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q ? q : lat+','+lon)}`;
const gmapLL = (lat, lon) => `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

/* ---------- Hero ---------- */
(function hero(){
  const t = T.trip;
  document.title = t.name;
  $('#tripName span').textContent = t.name;
  $('#tripName small').textContent = t.name_local;
  $('#heroEyebrow').textContent = `${t.city} · ${t.country}`;
  const days = T.days.length;
  $('#tripWhen').textContent = `${fmtD(t.start)} – ${fmtD(t.end)} ${parseD(t.end).getUTCFullYear()} · ${days} วัน ${t.nights} คืน · ${t.travelers} คน`;
  const hp = photo(t.hero_photo);
  if (hp){ const img=$('#heroImg'); img.onload=()=>img.classList.add('on'); img.src=hp.file; $('#heroCredit').innerHTML = credit(hp); }
})();

/* ---------- Theme ---------- */
(function theme(){
  const root=document.documentElement, b=$('#themeBtn');
  const dark=()=>{ const a=root.getAttribute('data-theme'); return a ? a==='dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
  const label=()=>{ b.textContent = dark() ? 'โหมดสว่าง' : 'โหมดมืด'; };
  b.addEventListener('click',()=>{ const n = dark() ? 'light' : 'dark'; root.setAttribute('data-theme', n); try{localStorage.setItem('theme', n);}catch(e){} label(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', label);
  label();
})();

/* ---------- Flip countdown ---------- */
(function countdown(){
  const out = T.flights[0], back = T.flights[T.flights.length-1];
  const tOut = Date.parse(out.dep_iso), tBack = Date.parse(back.dep_iso);
  const clock = $('#clock'), label = $('#countLabel');
  const units = [['วัน',3],['ชม.',2],['นาที',2],['วินาที',2]];
  clock.innerHTML = units.map(u=>`<div class="unit"><div class="cards">${'<div class="flip">0</div>'.repeat(u[1])}</div><span>${u[0]}</span></div>`).join('');
  const cells = $$('.unit', clock).map(u=>$$('.flip', u));
  function tick(){
    const now = Date.now(); let target;
    if (now < tOut){ target=tOut; label.textContent = `นับถอยหลังถึงเวลาเครื่องออก ${out.code}`; }
    else if (now < tBack){ target=tBack; label.textContent = `อยู่ระหว่างทริป · เวลาที่เหลือก่อนเครื่องกลับ ${back.code}`; }
    else { label.textContent = 'จบทริปแล้ว ขอบคุณที่เที่ยวด้วยกัน'; clock.hidden = true; return; }
    let s = Math.max(0, Math.floor((target-now)/1000));
    const v = [Math.floor(s/86400), Math.floor(s%86400/3600), Math.floor(s%3600/60), s%60];
    v.forEach((n,i)=>{ const str=String(n).padStart(units[i][1],'0').slice(-units[i][1]); cells[i].forEach((el,k)=>{ if(el.textContent!==str[k]){ el.textContent=str[k]; if(!RM){ el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); } } }); });
  }
  tick(); setInterval(tick, 1000);
})();

/* ---------- Weather (Open-Meteo) ---------- */
const WMO = c => c===0?['☀️','แดดจัด']:c<=2?['🌤️','มีเมฆบ้าง']:c===3?['☁️','เมฆมาก']:c<=48?['🌫️','หมอก']:c<=57?['🌦️','ฝนปรอย']:c<=67?['🌧️','ฝนตก']:c<=77?['🌨️','หิมะ']:c<=82?['🌧️','ฝนเป็นช่วง']:['⛈️','พายุฝน'];
(async function weather(){
  const box=$('#wx'), sub=$('#wxSub');
  const tripDates = new Set(T.days.map(d=>d.date));
  const render = (data, stamp) => {
    const d = data.daily; const today = localNow().date;
    const daysToStart = Math.round((parseD(T.trip.start) - parseD(today))/86400000);
    let idx = d.time.map((t,i)=>i);
    const tripIdx = idx.filter(i=>tripDates.has(d.time[i]));
    if (tripIdx.length){ idx = tripIdx; sub.textContent = `พยากรณ์ช่วงทริปที่${T.trip.city}${stamp?` · อัปเดต ${stamp}`:''}`; }
    else { idx = idx.slice(0,7); sub.textContent = daysToStart>0 ? `อากาศ 7 วันข้างหน้าที่${T.trip.city} · จะเปลี่ยนเป็นช่วงทริปเองเมื่อเหลือไม่เกิน 16 วัน (อีก ${daysToStart} วันถึงวันเดินทาง)` : `อากาศ 7 วันข้างหน้าที่${T.trip.city}`; }
    box.innerHTML = idx.map(i=>{ const [ic,txt]=WMO(d.weather_code[i]); return `<div class="wx-d${tripDates.has(d.time[i])?' trip':''}"><b>${fmtD(d.time[i])}</b><span class="ic" aria-hidden="true">${ic}</span><span class="rn">${txt}</span><span class="tp">${Math.round(d.temperature_2m_max[i])}° <span>/ ${Math.round(d.temperature_2m_min[i])}°</span></span><span class="rn">ฝน ${d.precipitation_probability_max[i] ?? '–'}%</span></div>`; }).join('');
  };
  const cached = ls.get('wx', null);
  if (cached) render(cached.data, cached.stamp + ' (ข้อมูลเก่า)');
  try{
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${T.trip.lat}&longitude=${T.trip.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=${encodeURIComponent(T.trip.tz)}&forecast_days=16`;
    const r = await fetch(u); if(!r.ok) throw 0; const data = await r.json();
    const stamp = new Date().toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'});
    ls.set('wx',{data,stamp}); render(data, stamp);
  }catch(e){ if(!cached) sub.textContent = 'โหลดพยากรณ์ไม่ได้ (ต้องต่อเน็ต) · ไทเปเดือนธันวาคมปกติ 15–21°C มีฝนปรอยบ่อย'; }
})();

/* ---------- Tickets ---------- */
(function tickets(){
  const bag = T.baggage;
  const bagHtml = bag ? `<dl><dt>ถือขึ้นเครื่อง</dt><dd>${esc(bag.carry)}</dd><dt>โหลด</dt><dd>${esc(bag.checked)}</dd></dl>` : `<p class="hint">ยังไม่ได้ใส่ข้อมูลกฎกระเป๋า</p>`;
  $('#tickets').innerHTML = T.flights.map((f,i)=>`
    <div class="ticket reveal">
      <button class="tk-flip" type="button" aria-pressed="false" aria-label="ตั๋ว ${esc(f.code)} แตะเพื่อพลิก">
        <div class="face">
          <div class="tk-row"><span><span class="tk-tag">${esc(f.dir)}</span> <b>${esc(f.code)}</b> · ${esc(f.airline)}</span><span>${fmtD(f.date)}</span></div>
          <div class="route">
            <div class="port"><b>${esc(f.from)}</b><small>${esc(f.dep)} · ${esc(f.from_name)}</small></div>
            <div class="path"><span class="plane" aria-hidden="true">✈</span></div>
            <div class="port r"><b>${esc(f.to)}</b><small>${esc(f.arr)} · ${esc(f.to_name)}</small></div>
          </div>
          <div class="hint">${esc(f.duration)} · ${f.passengers} ผู้โดยสาร${f.terminal?` · อาคาร ${esc(f.terminal)}`:''}</div>
        </div>
        <div class="face back bag"><h3>กฎกระเป๋า · ${esc(f.code)}</h3>${bagHtml}<p class="hint">แตะอีกครั้งเพื่อกลับ</p></div>
      </button>
      <div class="tk-btns" style="margin-top:8px">
        <a href="https://www.flightradar24.com/data/flights/${esc(f.code.replace(/\s/g,'').toLowerCase())}" target="_blank" rel="noopener">FR24 ↗</a>
        <a href="https://www.flightaware.com/live/flight/${esc(f.icao)}" target="_blank" rel="noopener">FlightAware ↗</a>
        <button type="button" data-notes="${esc(f.code.replace(/\s/g,''))}"> iPhone: Preview Flight</button>
      </div>
    </div>`).join('');
  $$('.tk-flip').forEach(b=>b.addEventListener('click',()=>b.setAttribute('aria-pressed', b.getAttribute('aria-pressed')!=='true')));
  $$('[data-notes]').forEach(b=>b.addEventListener('click', async ()=>{
    const code=b.dataset.notes;
    try{ await navigator.clipboard.writeText(code); }catch(e){}
    toast(`คัดลอก ${code} แล้ว · เปิดแอปโน้ต วางข้อความ แล้วแตะค้างที่เลขเที่ยวบินเพื่อดู Preview Flight`, 6000);
    setTimeout(()=>{ location.href='mobilenotes://'; }, 400);
  }));
})();

/* ---------- Plan ---------- */
const maps = {};
(function plan(){
  const tabs=$('#tabs'), days=$('#days'), H=T.hotel;
  tabs.innerHTML = T.days.map((d,i)=>{ const dt=parseD(d.date); return `<button class="tab" role="tab" type="button" aria-selected="${i===0}" aria-controls="day${i+1}" data-i="${i}"><b>วันที่ ${i+1}</b>${WD[dt.getUTCDay()]} ${dt.getUTCDate()}</button>`; }).join('');
  days.innerHTML = T.days.map((d,i)=>{
    const dt=parseD(d.date);
    const routeStops = d.stops.filter(s=>!s.skip_route);
    const pts = routeStops.map(s=>`${s.lat},${s.lon}`);
    const origin = `${H.lat},${H.lon}`;
    const dest = pts[pts.length-1] || origin;
    const wps = pts.slice(0,-1).slice(0,9).join('|');
    const gdir = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${wps?`&waypoints=${encodeURIComponent(wps)}`:''}&travelmode=transit`;
    return `<article class="day" id="day${i+1}" role="tabpanel" aria-label="วันที่ ${i+1}" data-i="${i}"><div class="day-in">
      <div class="day-head"><h3>วันที่ ${i+1} · ${WDL[dt.getUTCDay()]} ${dt.getUTCDate()} ${MO[dt.getUTCMonth()]} · ${esc(d.title)}</h3>${d.note?`<p>${esc(d.note)}</p>`:''}</div>
      <div class="mapbox" id="mapbox${i}">
        <div class="map" id="map${i}" aria-label="แผนที่วันที่ ${i+1}"></div>
        <div class="schematic" id="sch${i}"></div>
        <div class="map-ctl"><button type="button" data-full="${i}">เต็มจอ</button></div>
      </div>
      <div class="map-links"><a class="btn" href="${gdir}" target="_blank" rel="noopener">เปิดทุกจุดใน Google Maps ↗</a></div>
      <p class="sub" style="margin:0">แผนที่ส่วนที่เคยเปิดดูตอนมีเน็ตจะจำไว้ใช้ตอนออฟไลน์ ถ้าโหลดไม่ได้จะแสดงแผนผังลำดับจุดแทน</p>
      <ol class="rail">${d.stops.map((s,j)=>{
        const p = s.skip_photo ? null : photo(s.photo);
        return `<li class="st${s.hotel?' hotel':''} reveal" data-day="${i}" data-j="${j}" data-time="${esc(s.time)}">
          <span class="t">${esc(s.time)}</span><span class="n">${s.hotel?'H':j+1}</span>
          <div class="c"><h4>${esc(s.name)}</h4><div class="zh" lang="zh-TW">${esc(s.local)}</div>
          ${s.note?`<p>${esc(s.note)}</p>`:''}
          ${(s.hours||s.warn)?`<div class="chips">${s.hours?`<span class="chip">${esc(s.hours)}</span>`:''}${s.warn?`<span class="chip warn">${esc(s.warn)}</span>`:''}</div>`:''}
          ${p?`<img class="ph" loading="lazy" decoding="async" src="${esc(p.file)}" alt="${esc(s.name)}" data-cap="${esc(s.name)}" data-key="${esc(s.photo)}" width="${p.w||16}" height="${p.h||9}"><div class="ph-cap">${credit(p)}</div>`:''}
          <a class="btn" href="${gmap(s.lat,s.lon,s.local)}" target="_blank" rel="noopener">เปิดแผนที่ ↗</a></div></li>`; }).join('')}</ol>
    </div></article>`;
  }).join('');
  $('#extraPlaces').innerHTML = T.extras?.length ? `<h3>ที่ปักหมุดไว้แต่ยังไม่อยู่ในแผน</h3>` + T.extras.map(x=>`<div class="ex"><div><b>${esc(x.name)}</b> <span class="zh" lang="zh-TW">${esc(x.local)}</span><small>${esc(x.note)}</small></div><a class="btn" href="${gmap(x.lat,x.lon,x.local)}" target="_blank" rel="noopener">แผนที่ ↗</a></div>`).join('') : '';

  const tabEls = $$('.tab', tabs);
  let cur = 0;
  const sel = i => { cur=i; tabEls.forEach((t,k)=>t.setAttribute('aria-selected', String(k===i))); initMap(i); };
  window.goDay = (i, toMap=true, smooth=true) => {
    days.scrollTo({left: i*days.clientWidth, behavior: (smooth && !RM)?'smooth':'auto'}); sel(i);
    if (toMap) $('#mapbox'+i).scrollIntoView({behavior: RM?'auto':'smooth', block:'start'});
  };
  tabEls.forEach(t=>t.addEventListener('click',()=>goDay(+t.dataset.i)));
  let st; days.addEventListener('scroll',()=>{ clearTimeout(st); st=setTimeout(()=>{ const i=Math.round(days.scrollLeft/days.clientWidth); if(i!==cur) sel(i); },80); },{passive:true});
  addEventListener('resize',()=>{ days.scrollLeft = cur*days.clientWidth; Object.values(maps).forEach(m=>m.map&&m.map.invalidateSize()); });

  /* schematic fallback for each day */
  T.days.forEach((d,i)=>{
    const s = d.stops.filter(x=>!x.skip_route);
    const lats=s.map(x=>x.lat), lons=s.map(x=>x.lon);
    const [a,b,c,e]=[Math.min(...lats),Math.max(...lats),Math.min(...lons),Math.max(...lons)];
    const W=600,Hh=300,pad=36;
    const sx=v=>pad+(e===c?0.5:(v-c)/(e-c))*(W-2*pad), sy=v=>Hh-pad-(b===a?0.5:(v-a)/(b-a))*(Hh-2*pad);
    const pts=s.map(x=>[sx(x.lon),sy(x.lat)]);
    const num=x=>x.hotel?'H':(d.stops.indexOf(x)+1);
    $('#sch'+i).innerHTML = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="แผนผังลำดับจุดวันที่ ${i+1}">
      <polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-dasharray="6 6"/>
      ${pts.map((p,k)=>`<g><circle cx="${p[0]}" cy="${p[1]}" r="13" fill="${s[k].hotel?'var(--fg)':'var(--accent)'}"/><text x="${p[0]}" y="${p[1]+4.5}" text-anchor="middle" font-size="13" font-weight="600" fill="${s[k].hotel?'var(--bg)':'var(--accent-fg)'}">${num(s[k])}</text><text x="${p[0]}" y="${p[1]+30}" text-anchor="middle" font-size="12" fill="var(--fg)">${esc(s[k].name.length>14?s[k].name.slice(0,13)+'…':s[k].name)}</text></g>`).join('')}
      <text x="12" y="20" font-size="12" fill="var(--muted)">แผนผังสำรอง (ไม่ตามสเกล) · โหลดแผนที่ไม่ได้</text></svg>`;
  });

  function initMap(i){
    if (maps[i]) { setTimeout(()=>maps[i].map&&maps[i].map.invalidateSize(),50); return; }
    const box=$('#mapbox'+i);
    if (!window.L){ box.classList.add('fallback'); maps[i]={}; return; }
    const d=T.days[i];
    const map=L.map('map'+i,{zoomControl:true,attributionControl:true,scrollWheelZoom:false,tap:true});
    let loaded=0;
    const tl=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);
    tl.on('tileload',()=>{ loaded++; box.classList.remove('fallback'); });
    setTimeout(()=>{ if(!loaded) box.classList.add('fallback'); },6000);
    const rs=d.stops.filter(s=>!s.skip_route);
    const line=[[T.hotel.lat,T.hotel.lon]];
    rs.forEach(s=>{ if(!(s.hotel && line.length===1)) line.push([s.lat,s.lon]); });
    L.polyline(line,{color:getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#d6202f',weight:3,opacity:.85,dashArray:'6 6'}).addTo(map);
    L.marker([T.hotel.lat,T.hotel.lon],{icon:L.divIcon({className:'',html:'<div class="pin h">H</div>',iconSize:[26,26],iconAnchor:[13,13]})}).addTo(map).bindPopup(`<b>${esc(T.hotel.name)}</b><br>${esc(T.hotel.name_local)}`);
    d.stops.forEach((s,j)=>{ if(s.hotel||s.skip_route) return;
      L.marker([s.lat,s.lon],{icon:L.divIcon({className:'',html:`<div class="pin">${j+1}</div>`,iconSize:[26,26],iconAnchor:[13,13]})}).addTo(map)
       .bindPopup(`<b>${esc(s.time)} ${esc(s.name)}</b><br><span lang="zh-TW">${esc(s.local)}</span><br><a href="${gmap(s.lat,s.lon,s.local)}" target="_blank" rel="noopener">เปิดใน Google Maps</a>`); });
    map.fitBounds(L.latLngBounds(line).pad(0.15));
    maps[i]={map};
  }
  $$('[data-full]').forEach(b=>b.addEventListener('click',()=>{
    const i=+b.dataset.full, box=$('#mapbox'+i); const on=!box.classList.contains('full');
    box.classList.toggle('full',on); b.textContent=on?'ปิดเต็มจอ':'เต็มจอ'; document.body.style.overflow=on?'hidden':'';
    setTimeout(()=>maps[i]?.map?.invalidateSize(),60);
  }));
  addEventListener('keydown',e=>{ if(e.key==='Escape'){ const f=$('.mapbox.full'); if(f) f.querySelector('[data-full]').click(); } });

  /* Today mode */
  function today(){
    const n=localNow(); const i=T.days.findIndex(d=>d.date===n.date);
    $$('.st').forEach(el=>el.classList.remove('next','done'));
    const ban=$('#todayBanner');
    if (i<0){ ban.hidden=true; return -1; }
    const stops=$$(`.st[data-day="${i}"]`);
    const nxt=stops.find(el=>el.dataset.time>=n.hm);
    stops.forEach(el=>{ if(el.dataset.time<n.hm && el!==nxt) el.classList.add('done'); });
    if (nxt){ nxt.classList.add('next'); const s=T.days[i].stops[+nxt.dataset.j];
      ban.innerHTML=`<b>วันนี้ วันที่ ${i+1}</b> · ถัดไป ${esc(s.time)} ${esc(s.name)} <button type="button" class="btn" id="goNext" style="margin-left:6px">ไปดู</button>`;
      $('#goNext').onclick=()=>{ goDay(i,false); setTimeout(()=>nxt.scrollIntoView({behavior:RM?'auto':'smooth',block:'center'}),RM?0:350); };
    } else ban.innerHTML=`<b>วันนี้ วันที่ ${i+1}</b> · จบกิจกรรมของวันนี้แล้ว`;
    ban.hidden=false; return i;
  }
  const ti=today();
  requestAnimationFrame(()=>{ if(ti>=0) goDay(ti,false,false); else sel(0); });
  setInterval(today,60000);
})();

/* ---------- Hotel ---------- */
(function hotel(){
  const h=T.hotel, p=photo(h.photo);
  $('#hotelCard').innerHTML=`<h2>ที่พัก</h2><div class="hotel-card reveal">
    <h3>${esc(h.name)}</h3><div class="zh" lang="zh-TW">${esc(h.name_local)}</div>
    <dl><dt>ที่อยู่</dt><dd>${esc(h.address)}<br><span lang="zh-TW">${esc(h.address_local)}</span></dd>
    <dt>โทร</dt><dd style="user-select:all">${esc(h.phone)}</dd>
    <dt>เช็คอิน</dt><dd>${esc(h.checkin)} · เช็คเอาท์ ${esc(h.checkout)}</dd></dl>
    <div class="row-btns" style="margin-top:0"><a class="btn" href="${gmap(h.lat,h.lon,h.address_local)}" target="_blank" rel="noopener">เปิดแผนที่ ↗</a><button type="button" class="btn" id="hotelBig">แสดงที่อยู่ให้คนขับ</button></div></div>`;
  $('#hotelBig').onclick=()=>bigShow(`${h.name_local}\n${h.address_local}`, `${h.name} · ${h.phone}`);
})();

/* ---------- Currency ---------- */
(async function money(){
  const a=$('#fxThb'), b=$('#fxTwd'), note=$('#fxNote'), q=$('#fxQuick');
  let rate = ls.get('fx',null);
  const draw=()=>{ if(!rate) return; const r=rate.rate;
    if (document.activeElement===b) a.value = b.value===''?'':(+b.value / r).toFixed(2);
    else b.value = a.value===''?'':(+a.value * r).toFixed(0);
    note.textContent = `1 บาท ≈ ${r.toFixed(3)} TWD · 1 TWD ≈ ${(1/r).toFixed(3)} บาท · เรทวันที่ ${rate.date}${rate.stale?' (ข้อมูลเก่า ไม่มีเน็ต)':''}`;
    q.innerHTML=[50,100,200,500,1000].map(v=>`<span>${v} TWD ≈ ${(v/r).toFixed(0)} บาท</span>`).join('');
  };
  a.addEventListener('input',draw); b.addEventListener('input',draw);
  $('#fxSwap').onclick=()=>{ (document.activeElement===b?a:b).focus(); };
  if (rate){ rate.stale=true; draw(); }
  try{ const r=await fetch('https://open.er-api.com/v6/latest/THB'); const j=await r.json(); if(j.result!=='success') throw 0;
    rate={rate:j.rates.TWD, date:new Date(j.time_last_update_unix*1000).toLocaleDateString('th-TH',{dateStyle:'medium'})}; ls.set('fx',rate); draw();
    note.insertAdjacentHTML('beforeend',' · <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener">Rates By Exchange Rate API</a>');
  }catch(e){ if(!rate) note.textContent='โหลดเรทไม่ได้ (ต้องต่อเน็ตครั้งแรก)'; }
})();

/* ---------- Checklist ---------- */
(function checklist(){
  const ul=$('#checklist');
  let custom=ls.get('chk_custom',[]), done=ls.get('chk_done',{});
  const draw=()=>{
    const items=[...T.checklist.map(t=>({t,c:false})), ...custom.map(t=>({t,c:true}))];
    ul.innerHTML=items.map((it,k)=>`<li><label><input type="checkbox" id="chk${k}" data-t="${esc(it.t)}" ${done[it.t]?'checked':''}><span>${esc(it.t)}</span>${it.c?`<button type="button" class="del" data-del="${esc(it.t)}" aria-label="ลบ">✕</button>`:''}</label></li>`).join('');
    const n=items.filter(it=>done[it.t]).length;
    $('#checkSub').textContent=`เตรียมแล้ว ${n}/${items.length} · บันทึกไว้ในเครื่องนี้`;
    $('#checkBar').style.width=(items.length?n/items.length*100:0)+'%';
  };
  ul.addEventListener('change',e=>{ const t=e.target.dataset.t; if(t==null) return; if(e.target.checked) done[t]=1; else delete done[t]; ls.set('chk_done',done); draw(); });
  ul.addEventListener('click',e=>{ const d=e.target.dataset?.del; if(!d) return; e.preventDefault(); custom=custom.filter(x=>x!==d); delete done[d]; ls.set('chk_custom',custom); ls.set('chk_done',done); draw(); });
  $('#addCheck').addEventListener('submit',e=>{ e.preventDefault(); const v=$('#addCheckInput').value.trim(); if(!v) return; if(!custom.includes(v)&&!T.checklist.includes(v)) custom.push(v); ls.set('chk_custom',custom); $('#addCheckInput').value=''; draw(); });
  draw();
})();

/* ---------- Speech ---------- */
let voices=[]; const loadVoices=()=>{ voices=speechSynthesis?.getVoices?.()||[]; };
if ('speechSynthesis' in window){ loadVoices(); speechSynthesis.onvoiceschanged=loadVoices; }
function speak(text, lang){
  if(!('speechSynthesis' in window)){ toast('เครื่องนี้อ่านออกเสียงไม่ได้'); return; }
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text); u.lang=lang; u.rate=.9;
  const v=voices.find(v=>v.lang.replace('_','-')===lang)||voices.find(v=>v.lang.startsWith(lang.slice(0,2)));
  if(v) u.voice=v; speechSynthesis.speak(u);
}
function bigShow(text, sub){ $('#bigText').textContent=text; $('#bigSub').textContent=sub||''; $('#bigView').hidden=false; document.body.style.overflow='hidden'; }

/* ---------- Help ---------- */
(function help(){
  const LL=T.trip.lang_local, H=T.hotel;
  const opts=[{name:'ที่พัก: '+H.name, local:H.name_local, addr:H.address_local, sub:H.address}];
  const seen=new Set([H.name_local]);
  T.days.forEach((d,i)=>d.stops.forEach(s=>{ if(!seen.has(s.local)){ seen.add(s.local); opts.push({name:`วันที่ ${i+1}: ${s.name}`, local:s.local, addr:'', sub:s.name}); } }));
  T.extras?.forEach(x=>{ if(!seen.has(x.local)){ seen.add(x.local); opts.push({name:x.name, local:x.local, addr:'', sub:x.name}); } });
  const hp=T.hospital; opts.push({name:'โรงพยาบาล: '+hp.name, local:hp.name_local, addr:hp.address_local, sub:hp.address});
  const sel=$('#driverSel');
  sel.innerHTML=opts.map((o,k)=>`<option value="${k}">${esc(o.name)}</option>`).join('');
  const show=()=>{ const o=opts[+sel.value]; $('#driverBig').innerHTML=`請帶我去<br>${esc(o.local)}${o.addr?`<br><small style="font-size:.6em;font-weight:500">${esc(o.addr)}</small>`:''}`; $('#driverSub').textContent=`"ช่วยพาไปที่นี่" · ${o.sub}`; };
  sel.onchange=show; show();
  $('#driverSpeak').onclick=()=>{ const o=opts[+sel.value]; speak(`請帶我去${o.local}${o.addr?'，地址是'+o.addr:''}`, LL); };
  $('#driverFull').onclick=()=>{ const o=opts[+sel.value]; bigShow(`請帶我去\n${o.local}${o.addr?'\n'+o.addr:''}`, `ช่วยพาไปที่นี่ · ${o.sub}`); };

  $('#phrases').innerHTML=T.phrases.map((p,k)=>`<li><span class="th">${esc(p.th)}</span><span class="zh" lang="zh-TW">${esc(p.zh)}</span><span class="py">${esc(p.py)}</span><button type="button" data-say="${k}" aria-label="อ่านออกเสียง ${esc(p.th)}">🔊</button></li>`).join('');
  $('#phrases').addEventListener('click',e=>{ const k=e.target.closest('[data-say]')?.dataset.say; if(k!=null) speak(T.phrases[k].zh, LL); });

  $('#emerg').innerHTML=T.emergency.map(e=>`<li><span>${esc(e.label)}</span><b>${esc(e.num)}</b></li>`).join('');
  const c=T.consulate;
  $('#consulate').innerHTML=`<div class="info"><b>${esc(c.name)}</b><span lang="zh-TW" class="zh">${esc(c.name_local)}</span><span>${esc(c.address)}</span><span>โทร <b style="user-select:all">${esc(c.phone)}</b></span><span class="muted">${esc(c.note)} · <a href="${esc(c.url)}" target="_blank" rel="noopener">เว็บไซต์ ↗</a></span></div>`;
  $('#hospital').innerHTML=`<div class="info"><b>${esc(hp.name)}</b><span lang="zh-TW" class="zh">${esc(hp.name_local)}</span><span>${esc(hp.address)}</span><span class="muted">${esc(hp.note)}</span><a class="btn" style="align-self:flex-start;margin-top:4px" href="${gmap(hp.lat,hp.lon,hp.address_local)}" target="_blank" rel="noopener">เปิดแผนที่ ↗</a></div>`;

  /* Translator */
  let dir='th';
  const dirBtn=$('#trDir'), inp=$('#trIn'), out=$('#trOut');
  const setDir=d=>{ dir=d; dirBtn.textContent = d==='th'?'ไทย → จีน':'จีน → ไทย'; inp.placeholder = d==='th'?'พิมพ์หรือกดไมค์พูดภาษาไทย':'請輸入或按麥克風說中文'; };
  dirBtn.onclick=()=>setDir(dir==='th'?'zh':'th');
  async function translate(){
    const q=inp.value.trim(); if(!q) return;
    const sl=dir==='th'?'th':LL, tl=dir==='th'?LL:'th';
    out.textContent='กำลังแปล…'; out.lang = tl;
    try{
      const r=await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(q)}`);
      if(!r.ok) throw 0; const j=await r.json(); out.textContent=j[0].map(x=>x[0]).join(''); return;
    }catch(e){}
    try{
      const r=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${sl}|${tl}`);
      const j=await r.json(); out.textContent=j.responseData.translatedText; return;
    }catch(e){ out.textContent='แปลไม่ได้ ต้องต่อเน็ต'; }
  }
  $('#trGo').onclick=translate;
  $('#trSpeak').onclick=()=>{ const t=out.textContent; if(t) speak(t, dir==='th'?LL:'th-TH'); };
  $('#trFull').onclick=()=>{ if(out.textContent) bigShow(out.textContent, inp.value); };
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  function mic(btn, lang, d){
    if(!SR){ btn.disabled=true; btn.title='เครื่องนี้ใช้ไมค์พิมพ์เสียงไม่ได้'; return; }
    btn.onclick=()=>{
      const r=new SR(); r.lang=lang; r.interimResults=true; r.continuous=false;
      setDir(d); btn.classList.add('mic-on'); inp.value='';
      r.onresult=e=>{ inp.value=[...e.results].map(x=>x[0].transcript).join(''); };
      r.onerror=e=>{ toast(e.error==='not-allowed'?'ยังไม่ได้อนุญาตไมค์ · ถ้าเปิดจากไอคอนบนหน้าจอใช้ไม่ได้ ให้เปิดใน Safari':'ฟังไม่ชัด ลองใหม่อีกครั้ง',4000); };
      r.onend=()=>{ btn.classList.remove('mic-on'); if(inp.value.trim()) translate(); };
      try{ r.start(); }catch(e){ btn.classList.remove('mic-on'); }
    };
  }
  mic($('#trMicTh'),'th-TH','th'); mic($('#trMicZh'),LL,'zh');
  if(!SR) $('#trNote').textContent='การแปลต้องต่อเน็ต · เครื่องนี้ใช้ไมค์ไม่ได้ ใช้การพิมพ์หรือปุ่มไมค์บนคีย์บอร์ดแทน';
})();

/* ---------- Overlays ---------- */
function closeAll(){ ['#bigView','#lightbox','#sumSheet'].forEach(s=>$(s).hidden=true); document.body.style.overflow=''; }
document.addEventListener('click',e=>{ if(e.target.closest('[data-close]')) closeAll(); if(e.target.id==='sumSheet') closeAll(); });
addEventListener('keydown',e=>{ if(e.key==='Escape') closeAll(); });

/* Lightbox: grow from the thumbnail's own position */
document.addEventListener('click',e=>{
  const im=e.target.closest('img.ph'); if(!im) return;
  const p=P[im.dataset.key]; const lb=$('#lightbox'), big=$('#lbImg');
  big.src=p?.full||im.src; big.alt=im.alt; $('#lbCap').innerHTML=`${esc(im.dataset.cap)} · ${credit(p)}`;
  lb.hidden=false; document.body.style.overflow='hidden';
  if(RM || !big.animate) return;
  const from=im.getBoundingClientRect();
  requestAnimationFrame(()=>{ const to=big.getBoundingClientRect(); if(!to.width) return;
    const sx=from.width/to.width, sy=from.height/to.height, dx=from.left-to.left, dy=from.top-to.top;
    big.animate([{transformOrigin:'top left',transform:`translate(${dx}px,${dy}px) scale(${sx},${sy})`},{transformOrigin:'top left',transform:'none'}],{duration:320,easing:'cubic-bezier(.2,.8,.2,1)'});
    lb.animate([{backgroundColor:'rgba(0,0,0,0)'},{backgroundColor:'rgba(0,0,0,.92)'}],{duration:320});
  });
});

/* ---------- Summary images (canvas) ---------- */
(function summary(){
  let useLocal=false;
  const btnLang=$('#sumLang');
  btnLang.onclick=()=>{ useLocal=!useLocal; btnLang.textContent=useLocal?'ชื่อภาษาไทย':'ชื่อภาษาจีน'; build(); };
  $('#sumBtn').onclick=()=>{ $('#sumSheet').hidden=false; document.body.style.overflow='hidden'; build(); };
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function wrap(ctx,text,maxW){ const out=[]; let line=''; for(const ch of [...text]){ if(ctx.measureText(line+ch).width>maxW && line){ out.push(line); line=ch; } else line+=ch; } if(line) out.push(line); return out; }
  async function canvasFor(kind, i){
    try{ await Promise.all(['600 64px Kanit','700 64px Kanit','400 30px "Noto Sans Thai"','500 30px "Noto Sans Thai"'].map(f=>document.fonts.load(f))); }catch(e){}
    const W=1080,H=1350,c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d');
    const g=x.createLinearGradient(0,0,0,H); g.addColorStop(0,'#1b2a4a'); g.addColorStop(1,'#0b1220'); x.fillStyle=g; x.fillRect(0,0,W,H);
    // skyline band
    x.fillStyle='rgba(255,255,255,.06)'; for(let k=0;k<22;k++){ const w=30+((k*37)%40), h=60+((k*53)%120); x.fillRect(k*52,H-h,w,h); }
    x.fillStyle='rgba(255,255,255,.12)'; x.fillRect(W-170,H-430,40,430); for(let k=0;k<8;k++) x.fillRect(W-182,H-420+k*50,64,8);
    const red='#ff5a64', zh='"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif';
    const nm=s=>useLocal?s.local:s.name;
    x.fillStyle='rgba(255,255,255,.7)'; x.font='500 30px "Noto Sans Thai"'; x.fillText(`${T.trip.name} · ${T.trip.name_local}`,72,100);
    if(kind==='day'){
      const d=T.days[i], dt=parseD(d.date);
      x.fillStyle=red; x.font='700 120px Kanit'; x.fillText(`วันที่ ${i+1}`,72,240);
      x.fillStyle='#fff'; x.font='600 46px Kanit'; x.fillText(`${WDL[dt.getUTCDay()]} ${dt.getUTCDate()} ${MO[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`,72,310);
      x.font=(useLocal?`600 40px ${zh}`:'500 38px "Noto Sans Thai"'); x.fillStyle='rgba(255,255,255,.85)';
      x.fillText(useLocal? d.stops.filter(s=>!s.hotel).slice(0,3).map(s=>s.local).join(' · ') : d.title,72,370);
      let y=470; const step=Math.min(104, (H-560)/d.stops.length);
      x.strokeStyle=red; x.lineWidth=5; x.beginPath(); x.moveTo(190,y-10); x.lineTo(190,y+step*(d.stops.length-1)); x.stroke();
      d.stops.forEach((s,j)=>{
        x.fillStyle='rgba(255,255,255,.7)'; x.font='500 30px Kanit'; x.textAlign='right'; x.fillText(s.time,150,y+10); x.textAlign='left';
        x.fillStyle=s.hotel?'#fff':red; x.beginPath(); x.arc(190,y,20,0,7); x.fill();
        x.fillStyle=s.hotel?'#1b2a4a':'#fff'; x.font='600 22px Kanit'; x.textAlign='center'; x.fillText(s.hotel?'H':String(j+1),190,y+8); x.textAlign='left';
        x.fillStyle='#fff'; x.font=useLocal?`600 38px ${zh}`:'600 38px Kanit';
        const ln=wrap(x,nm(s),760); x.fillText(ln[0],240,y+13);
        y+=step;
      });
    } else {
      x.fillStyle='#fff'; x.font='700 104px Kanit'; x.fillText(useLocal?T.trip.name_local:T.trip.name,72,240);
      x.fillStyle='rgba(255,255,255,.85)'; x.font='500 36px "Noto Sans Thai"'; x.fillText(`${fmtD(T.trip.start)} – ${fmtD(T.trip.end)} · ${T.days.length} วัน ${T.trip.nights} คืน · ${T.trip.travelers} คน`,72,305);
      let y=410;
      T.days.forEach((d,k)=>{
        x.fillStyle=red; x.font='700 44px Kanit'; x.fillText(`วันที่ ${k+1}`,72,y);
        x.fillStyle='rgba(255,255,255,.6)'; x.font='500 30px Kanit'; x.fillText(fmtD(d.date),280,y);
        x.fillStyle='#fff'; x.font=useLocal?`500 32px ${zh}`:'500 32px "Noto Sans Thai"';
        const names=d.stops.filter(s=>!s.hotel&&!s.skip_route).map(nm).join(' → ');
        wrap(x,names,920).slice(0,3).forEach((l,m)=>x.fillText(l,72,y+52+m*44));
        y+=52+Math.min(3,wrap(x,names,920).length)*44+40;
      });
      const f=T.flights; x.fillStyle='rgba(255,255,255,.7)'; x.font='500 30px Kanit';
      x.fillText(`✈ ${f[0].code} ${f[0].from}→${f[0].to} ${f[0].dep}   ·   ${f[f.length-1].code} ${f[f.length-1].from}→${f[f.length-1].to} ${f[f.length-1].dep}`,72,H-90);
    }
    x.fillStyle='rgba(255,255,255,.45)'; x.font='400 22px "Noto Sans Thai"'; x.fillText(useLocal?'台北之旅':'ไทเป ทริป',72,H-40);
    return c;
  }
  async function build(){
    const grid=$('#sumGrid'); grid.innerHTML='<p class="sub">กำลังวาด…</p>';
    const items=[['ภาพรวมทริป','all',0],...T.days.map((d,i)=>[`วันที่ ${i+1}`,'day',i])];
    const figs=[];
    for(const [label,kind,i] of items){
      const c=await canvasFor(kind,i); const blob=await new Promise(r=>c.toBlob(r,'image/png')); const url=URL.createObjectURL(blob);
      const name=`taipei-${kind==='all'?'overview':'day'+(i+1)}${useLocal?'-zh':''}.png`;
      figs.push({label,url,blob,name});
    }
    grid.innerHTML=figs.map((f,k)=>`<figure><img src="${f.url}" alt="${esc(f.label)}"><figcaption class="sub" style="margin:0">${esc(f.label)}</figcaption><div class="row-btns"><a class="btn" href="${f.url}" download="${f.name}">บันทึก</a><button type="button" class="btn" data-share="${k}">แชร์</button></div></figure>`).join('');
    grid.onclick=async e=>{ const k=e.target.dataset?.share; if(k==null) return; const f=figs[k];
      const file=new File([f.blob],f.name,{type:'image/png'});
      if(navigator.canShare?.({files:[file]})){ try{ await navigator.share({files:[file],title:f.label}); }catch(err){} }
      else toast('เครื่องนี้แชร์ไฟล์ไม่ได้ ใช้ปุ่มบันทึกแทน'); };
  }
})();

/* ---------- Print sheet (A4 cards) ---------- */
(function print(){
  const f=T.flights, h=T.hotel;
  $('#printSheet').innerHTML=`<div class="ps-cover"><div><h1>${esc(T.trip.name)}</h1><p>${fmtD(T.trip.start)} – ${fmtD(T.trip.end)} ${parseD(T.trip.end).getUTCFullYear()} · ${T.trip.travelers} คน</p></div><p>${f.map(x=>`${esc(x.code)} ${esc(x.from)}→${esc(x.to)} ${fmtD(x.date)} ${esc(x.dep)}`).join('<br>')}</p></div>
  <div class="ps-grid">
    ${T.days.map((d,i)=>`<div class="ps-card"><h2>วันที่ ${i+1} · ${fmtD(d.date)} · ${esc(d.title)}</h2><ol>${d.stops.map(s=>`<li><b>${esc(s.time)}</b> ${esc(s.name)} <span class="z">${esc(s.local)}</span>${s.hours?` · ${esc(s.hours)}`:''}</li>`).join('')}</ol></div>`).join('')}
    <div class="ps-card"><h2>ที่พัก</h2>${esc(h.name)} <span class="z">${esc(h.name_local)}</span><br>${esc(h.address_local)}<br>${esc(h.address)}<br>โทร ${esc(h.phone)} · เช็คอิน ${esc(h.checkin)} · เช็คเอาท์ ${esc(h.checkout)}</div>
    <div class="ps-card"><h2>ฉุกเฉิน</h2>${T.emergency.map(e=>`${esc(e.label)} <b>${esc(e.num)}</b>`).join('<br>')}<br>${esc(T.consulate.name)} ${esc(T.consulate.phone)}</div>
  </div>`;
  $('#printBtn').onclick=()=>window.print();
})();

/* ---------- Credits ---------- */
(function credits(){
  const used=Object.entries(P);
  $('#creditList').innerHTML=used.map(([k,p])=>`<li>${esc(p.label||k)}: <a href="${esc(p.page)}" target="_blank" rel="noopener">${esc(p.title||'Wikimedia Commons')}</a> · ${esc(p.author||'ไม่ระบุ')} · ${p.licurl?`<a href="${esc(p.licurl)}" target="_blank" rel="noopener">${esc(p.license)}</a>`:esc(p.license)}</li>`).join('') || '<li>ยังไม่มีรูป</li>';
  $('#verLine').textContent=`เวอร์ชัน ${window.APP_VERSION}`;
})();

/* ---------- Reveal on scroll ---------- */
(function reveal(){
  if(RM || !('IntersectionObserver' in window)) return;
  const io=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.remove('pre'); io.unobserve(e.target); } }),{rootMargin:'0px 0px -8% 0px'});
  $$('.reveal').forEach(el=>{ const r=el.getBoundingClientRect(); if(r.top>innerHeight){ el.classList.add('pre'); io.observe(el); } });
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
