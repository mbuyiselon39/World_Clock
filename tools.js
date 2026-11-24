/* Planning calculations use Intl's IANA time-zone data; no server or API key is required. */
const cityInfo = {
 'America/New_York':['US','USD','United States'], 'America/Chicago':['US','USD','United States'], 'America/Denver':['US','USD','United States'], 'America/Los_Angeles':['US','USD','United States'], 'America/Toronto':['CA','CAD','Canada'], 'America/Vancouver':['CA','CAD','Canada'], 'America/Mexico_City':['MX','MXN','Mexico'],
 'Europe/London':['GB','GBP','United Kingdom'], 'Europe/Paris':['FR','EUR','France'], 'Europe/Berlin':['DE','EUR','Germany'], 'Europe/Rome':['IT','EUR','Italy'], 'Europe/Madrid':['ES','EUR','Spain'], 'Europe/Moscow':['RU','RUB','Russia'], 'Asia/Tokyo':['JP','JPY','Japan'], 'Asia/Shanghai':['CN','CNY','China'], 'Asia/Hong_Kong':['HK','HKD','Hong Kong'], 'Asia/Singapore':['SG','SGD','Singapore'], 'Asia/Dubai':['AE','AED','United Arab Emirates'], 'Asia/Kolkata':['IN','INR','India'], 'Asia/Seoul':['KR','KRW','South Korea'], 'Australia/Sydney':['AU','AUD','Australia'], 'Australia/Melbourne':['AU','AUD','Australia'], 'Pacific/Auckland':['NZ','NZD','New Zealand'], 'America/Sao_Paulo':['BR','BRL','Brazil'], 'America/Buenos_Aires':['AR','ARS','Argentina'], 'America/Santiago':['CL','CLP','Chile'], 'Africa/Cairo':['EG','EGP','Egypt'], 'Africa/Johannesburg':['ZA','ZAR','South Africa'], 'Africa/Lagos':['NG','NGN','Nigeria']
};
function zonedParts(date, zone) {
 const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:zone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23', weekday:'short'}).formatToParts(date).map(x => [x.type,x.value]));
 return {year:+p.year, month:+p.month, day:+p.day, hour:+p.hour, minute:+p.minute, second:+p.second, weekday:p.weekday};
}
function localToInstants(value, zone) {
 const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
 if (!m) return [];
 const [,y,mo,d,h,mi] = m.map(Number), wall = Date.UTC(y,mo-1,d,h,mi);
 if (!Number.isFinite(wall) || new Date(wall).getUTCDate() !== d || +h > 23 || +mi > 59) return [];
 const offsets = new Set();
 for (let delta=-48; delta<=48; delta+=6) {
  const sample = new Date(wall + delta*3600000), p = zonedParts(sample,zone);
  offsets.add(Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-sample.getTime());
 }
 return [...offsets].map(offset=>new Date(wall-offset)).filter(date=>{
  const p=zonedParts(date,zone); return p.year===y && p.month===mo && p.day===d && p.hour===h && p.minute===mi;
 }).sort((a,b)=>a-b);
}
function formatAt(date, zone) { return new Intl.DateTimeFormat('en', {timeZone:zone, weekday:'short', year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', timeZoneName:'short'}).format(date); }
function solarAt(point, now) {
 // Approximate solar elevation, including longitude and seasonal declination.
 const day=(now.getTime()-Date.UTC(now.getUTCFullYear(),0,0))/86400000;
 const decl=23.44*Math.sin((2*Math.PI/365)*(day-81))*Math.PI/180;
 const solarHour=now.getUTCHours()+now.getUTCMinutes()/60+point[1]/15;
 const angle=(solarHour-12)*15*Math.PI/180, lat=point[0]*Math.PI/180;
 return Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(angle)>0;
}
function solarStatus(zone, now) {
 const point=coordinates[zone]; return point ? (solarAt(point,now) ? '☀ DAYTIME' : '☾ NIGHTTIME') : 'DAY / NIGHT UNAVAILABLE';
}
let daylightLayer;
function updateDaylightLayer() {
 if (!map || !daylightLayer) return;
 daylightLayer.clearLayers(); const now=new Date();
 for(let lat=-80;lat<80;lat+=10) for(let lon=-180;lon<180;lon+=10) {
  if (!solarAt([lat+5,lon+5],now)) L.rectangle([[lat,lon],[lat+10,lon+10]],{stroke:false,fillColor:'#071424',fillOpacity:0.32,interactive:false}).addTo(daylightLayer);
 }
}
function toggleDaylight() {
 if (!map) { document.getElementById('mapFallback').hidden=false; return; } const button=document.getElementById('daylightToggle');
 if (daylightLayer) { map.removeLayer(daylightLayer); daylightLayer=null; button.setAttribute('aria-pressed','false'); button.textContent='☀ Show approximate daylight layer'; }
 else { daylightLayer=L.layerGroup().addTo(map); updateDaylightLayer(); button.setAttribute('aria-pressed','true'); button.textContent='☾ Hide approximate daylight layer'; }
}
function savedOption(select, clocks, previous) {
 select.replaceChildren();
 clocks.forEach(c=>{const option=document.createElement('option'); option.value=c.timezone; option.textContent=c.name; select.append(option);});
 if (clocks.some(c=>c.timezone===previous)) select.value=previous;
}
function refreshToolCities() {
 ['meetingZone','convertFrom','convertTo','insightCity'].forEach(id=>{const select=document.getElementById(id); if (select) savedOption(select,activeClocks,select.value);});
 const to=document.getElementById('convertTo'); if (to && !to.dataset.initialized && activeClocks.length>1) {to.selectedIndex=1; to.dataset.initialized='true';}
}
function showText(id, text) { document.getElementById(id).textContent=text; }
function row(parent, title, text) { const item=document.createElement('div'); item.className='result-row'; const strong=document.createElement('strong'); strong.textContent=title; const detail=document.createElement('span'); detail.textContent=text; item.append(strong,detail); parent.append(item); }
function findMeetings() {
 const result=document.getElementById('meetingResults'); result.replaceChildren();
 const date=document.getElementById('meetingDate').value, zone=document.getElementById('meetingZone').value;
 if (!zone || !date || !activeClocks.length) return showText('meetingResults','Add at least one location and choose a date.');
 const start=localToInstants(date+'T00:00',zone);
 if (start.length!==1) return showText('meetingResults','Midnight on this date is ambiguous or unavailable in the reference city. Choose another date.');
 const choices=[];
 // Check actual instants for the reference date, including short and long DST days.
 for (let t=start[0].getTime();t<start[0].getTime()+27*3600000;t+=1800000) {
  const instant=new Date(t), ref=zonedParts(instant,zone);
  if (`${ref.year}-${String(ref.month).padStart(2,'0')}-${String(ref.day).padStart(2,'0')}`!==date) continue;
  const local=activeClocks.map(c=>({clock:c, parts:zonedParts(instant,c.timezone)}));
  const score=local.filter(({parts:p})=>!['Sat','Sun'].includes(p.weekday) && p.hour>=9 && (p.hour<16 || (p.hour===16 && p.minute===0))).length;
  choices.push({instant,local,score});
 }
 choices.sort((a,b)=>b.score-a.score || a.instant-b.instant);
 if (!choices.length) return showText('meetingResults','No slots available for this date.');
 const intro=document.createElement('p'); intro.textContent=`Top slots · ${activeClocks.length} location${activeClocks.length===1?'':'s'} · full hour within business hours`; result.append(intro);
 choices.slice(0,5).forEach((c,i)=>row(result,`#${i+1} · ${c.score}/${activeClocks.length} within hours`,c.local.map(({clock})=>`${clock.name}: ${formatAt(c.instant,clock.timezone)}`).join(' | ')));
}
function convertTime() {
 const value=document.getElementById('convertDate').value, from=document.getElementById('convertFrom').value, to=document.getElementById('convertTo').value, raw=document.getElementById('flightMinutes').value, duration=Number(raw);
 if (!from || !to || !value || raw==='' || !Number.isInteger(duration) || duration<0 || duration>10080) return showText('convertResults','Choose locations, a date and time, and a duration from 0 to 10,080 minutes.');
 const instants=localToInstants(value,from);
 if (!instants.length) return showText('convertResults','This local time does not exist, likely because clocks move forward. Choose another time.');
 if (instants.length>1) return showText('convertResults',`This local time occurs twice when clocks move back. Choose an unambiguous time. Possible instants: ${instants.map(d=>d.toISOString()).join(' or ')}.`);
 const result=document.getElementById('convertResults'); result.replaceChildren(); row(result,'Departure',formatAt(instants[0],from)); row(result,'Same instant at destination',formatAt(instants[0],to)); row(result,`Arrival after ${duration} minutes`,formatAt(new Date(instants[0].getTime()+duration*60000),to));
}
async function fetchJSON(url) {
 const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),10000);
 try { const response=await fetch(url,{signal:controller.signal}); if (!response.ok) throw Error(`HTTP ${response.status}`); return await response.json(); } finally {clearTimeout(timer);}
}
function link(parent,label,url) { const a=document.createElement('a'); a.href=url; a.target='_blank'; a.rel='noopener noreferrer'; a.textContent=label+' ↗'; a.className='source-link'; parent.append(a); }
let insightRequest=0;
async function loadInsights() {
 const zone=document.getElementById('insightCity').value, clock=activeClocks.find(c=>c.timezone===zone), info=cityInfo[zone], point=coordinates[zone];
 if (!clock || !info || !point) { ['weatherResults','holidayResults','marketResults','resourceResults'].forEach(id=>showText(id,'Add a supported location to load insights.')); return; }
 const request=++insightRequest, ids=['weatherResults','holidayResults','marketResults','resourceResults']; ids.forEach(id=>showText(id,'Loading…'));
 const isCurrent=()=>request===insightRequest;
 const [lat,lon]=point, now=new Date(), local=zonedParts(now,zone), year=local.year;
 const weatherURL=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=${encodeURIComponent(zone)}&forecast_days=3`;
 const airURL=`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi&timezone=${encodeURIComponent(zone)}`;
 Promise.allSettled([fetchJSON(weatherURL),fetchJSON(airURL)]).then(([weather,air])=>{
  if (!isCurrent()) return; const out=document.getElementById('weatherResults'); out.replaceChildren();
  if (weather.status==='fulfilled' && weather.value.current && weather.value.daily) { const w=weather.value, daily=w.daily;
   row(out,'Current',`${w.current.temperature_2m}°C · ${w.current.is_day ? 'Day' : 'Night'} · weather code ${w.current.weather_code}`);
   row(out,'Today’s daylight',`Sunrise ${daily.sunrise?.[0]?.slice(11) || 'unavailable'} · Sunset ${daily.sunset?.[0]?.slice(11) || 'unavailable'} local time`);
   daily.time.forEach((day,i)=>row(out,day,`${daily.temperature_2m_min[i]}° to ${daily.temperature_2m_max[i]}°C · weather code ${daily.weather_code[i]}`));
  } else row(out,'Weather','Forecast unavailable.');
  row(out,'Air quality',air.status==='fulfilled' && air.value.current ? `US AQI ${air.value.current.us_aqi}` : 'Unavailable');
  link(out,'Open-Meteo weather & air quality','https://open-meteo.com/');
  const note=document.createElement('p'); note.textContent='Weather codes follow WMO conventions. Forecasts are estimates; consult local authorities for severe-weather warnings.'; out.append(note);
 });
 Promise.allSettled([fetchJSON(`https://date.nager.at/api/v3/PublicHolidays/${year}/${info[0]}`),fetchJSON(`https://date.nager.at/api/v3/PublicHolidays/${year+1}/${info[0]}`)]).then(results=>{
  if (!isCurrent()) return; const out=document.getElementById('holidayResults'); out.replaceChildren(); const today=`${year}-${String(local.month).padStart(2,'0')}-${String(local.day).padStart(2,'0')}`;
  const data=results.flatMap(r=>r.status==='fulfilled' && Array.isArray(r.value)?r.value:[]).filter(h=>h.date>=today && h.global).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
  if (!data.length) row(out,'National holidays','No upcoming national holidays available from this source.'); else data.forEach(h=>{const weekday=new Date(h.date+'T12:00:00Z').getUTCDay(); row(out,h.date,`${h.localName || h.name}${weekday===1 || weekday===5 ? ' · potential long weekend' : ''}`);});
  link(out,'Nager.Date public holidays','https://date.nager.at/'); const note=document.createElement('p'); note.textContent='National holidays only; regional holidays and school terms are not included. Verify dates locally.'; out.append(note);
 });
 const market=document.getElementById('marketResults'); market.replaceChildren();
 const markets=[['New York','America/New_York',9*60+30,16*60],['London','Europe/London',8*60,16*60+30],['Tokyo','Asia/Tokyo',9*60,15*60+30],['Sydney','Australia/Sydney',10*60,16*60]];
 markets.forEach(([name,tz,start,end])=>{const p=zonedParts(now,tz), min=p.hour*60+p.minute; let open=!['Sat','Sun'].includes(p.weekday)&&min>=start&&min<end; if(name==='Tokyo' && min>=11*60+30 && min<12*60+30) open=false; row(market,name,`${open?'Regular hours':'Outside regular hours'} · ${formatAt(now,tz)}`);});
 const note=document.createElement('p'); note.textContent='Indicative regular trading hours only; holidays, early closures and interruptions are not checked. Not trading advice.'; market.append(note);
 fetchJSON(`https://api.frankfurter.app/latest?from=USD&to=${encodeURIComponent(info[1])}`).then(data=>{if(!isCurrent())return; if(info[1]==='USD') return; if(data.rates && data.rates[info[1]]) row(market,`USD / ${info[1]}`,`${data.rates[info[1]]} · ${data.date}`);}).catch(()=>{if(isCurrent()&&info[1]!=='USD')row(market,'Exchange rate','Unavailable for this currency.');});
 if(info[1]==='USD') row(market,'Currency','USD · reference currency'); link(market,'Frankfurter exchange rates','https://www.frankfurter.app/');
 const resources=document.getElementById('resourceResults'); resources.replaceChildren();
 row(resources,info[2],`Local time: ${formatAt(now,zone)}`);
 const feed=document.createElement('div'); feed.id='regionalFeed'; resources.append(feed);
 const launches=document.createElement('div'); launches.id='launchFeed'; resources.append(launches);
 fetchJSON(`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent('\"'+info[2]+'\" sourcelang:english')}&mode=artlist&maxrecords=5&sort=datedesc&format=json&timespan=7d`).then(data=>{
  if(!isCurrent()) return; if(!Array.isArray(data.articles) || !data.articles.length) return row(feed,'Regional headlines','No recent headlines available.');
  data.articles.slice(0,5).forEach(article=>{ try { const url=new URL(article.url); if(url.protocol!=='https:' && url.protocol!=='http:') return; link(feed,`${article.title || 'Headline'} · ${article.domain || url.hostname}`,url.href); } catch (_) {} });
  link(feed,'Headlines via GDELT','https://www.gdeltproject.org/');
 }).catch(()=>{if(isCurrent()) row(feed,'Regional headlines','Feed unavailable; use the news search below.');});
 fetchJSON('https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=3').then(data=>{
  if(!isCurrent()) return; if(!Array.isArray(data.results) || !data.results.length) return row(launches,'Upcoming launches','No launch data available.');
  data.results.slice(0,3).forEach(event=>row(launches,event.name || 'Launch', event.net ? `${formatAt(new Date(event.net),zone)} · ${event.status?.name || 'Status unavailable'}` : 'Time to be announced'));
  link(launches,'Launch data: The Space Devs','https://thespacedevs.com/');
 }).catch(()=>{if(isCurrent())row(launches,'Upcoming launches','Feed unavailable; see NASA below.');});
 link(resources,'Regional news search',`https://news.google.com/search?q=${encodeURIComponent(info[2])}`);
 link(resources,'Public observances calendar',`https://date.nager.at/`);
 link(resources,'NASA upcoming launches','https://www.nasa.gov/launches/');
 link(resources,'Official travel advisories & entry information','https://travel.state.gov/content/travel/en/international-travel/International-Travel-Country-Information-Pages.html');
 link(resources,'Local emergency number guidance','https://travel.state.gov/content/travel/en/international-travel/emergencies.html');
 const caution=document.createElement('p'); caution.textContent='Check current official local guidance for emergency numbers, visas, weather alerts and entry requirements. US travel advice may not apply to every nationality. In an emergency, contact local services.'; resources.append(caution);
}
document.addEventListener('DOMContentLoaded',()=>{
 refreshToolCities(); document.addEventListener('clocksChanged',()=>{ insightRequest++; refreshToolCities(); ['weatherResults','holidayResults','marketResults','resourceResults'].forEach(id=>showText(id,'Load insights for the selected location.')); });
 const now=new Date(), p=zonedParts(now,activeClocks[0]?.timezone || 'UTC');
 const date=`${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;
 document.getElementById('meetingDate').value=date; document.getElementById('convertDate').value=`${date}T12:00`;
 document.getElementById('daylightToggle').addEventListener('click',toggleDaylight); setInterval(updateDaylightLayer,600000);
 document.getElementById('findMeetings').addEventListener('click',findMeetings); document.getElementById('convertButton').addEventListener('click',convertTime); document.getElementById('loadInsights').addEventListener('click',loadInsights);
 document.getElementById('insightCity').addEventListener('change',()=>{insightRequest++; ['weatherResults','holidayResults','marketResults','resourceResults'].forEach(id=>showText(id,'Load insights for the selected location.'));});
});
