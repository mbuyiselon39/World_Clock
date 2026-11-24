/* Live city lookup and structured sports data adapters. No API keys or server required. */
let searchGeneration = 0;
let searchResults = [];
function normalizeCity(item) {
 if (!item || !Number.isInteger(item.id) || typeof item.name !== 'string' || typeof item.timezone !== 'string' || !Number.isFinite(item.latitude) || !Number.isFinite(item.longitude) || Math.abs(item.latitude)>90 || Math.abs(item.longitude)>180 || !/^[A-Z]{2}$/.test(item.country_code || '') || !item.country) return null;
 try { new Intl.DateTimeFormat('en', {timeZone:item.timezone}); } catch (_) { return null; }
 return {id:`geo:${item.id}`, name:item.name, timezone:item.timezone, coordinates:[item.latitude,item.longitude], countryCode:item.country_code, country:item.country, region:item.admin1 || ''};
}
async function searchCities() {
 const input=document.getElementById('citySearch'), status=document.getElementById('citySearchMessage'), select=document.getElementById('cityResults'), query=input.value.trim(), generation=++searchGeneration;
 searchResults=[]; select.replaceChildren(new Option('Search to find a location…',''));
 if (query.length<2) {status.textContent='Enter at least two characters.'; return;}
 status.textContent='Searching…';
 try {
  const data=await fetchJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=100&language=en&format=json`);
  if(generation!==searchGeneration) return;
  const countryFilter=document.getElementById('cityCountryFilter').value;
  searchResults=(Array.isArray(data.results)?data.results:[]).map(normalizeCity).filter(city=>city && (!countryFilter || city.countryCode===countryFilter));
  select.replaceChildren(new Option('Choose a search result…',''));
  searchResults.forEach(city=>select.add(new Option([city.name,city.region,city.country,city.timezone].filter(Boolean).join(' · '),city.id)));
  status.textContent=searchResults.length ? `${searchResults.length} results. Select a city, then add it. Refine your search if needed.` : 'No supported results in the first 100 matches. Try a more specific name or remove the country filter.';
 } catch (_) {if(generation===searchGeneration) status.textContent='City search is unavailable. Try again or use the city/time zone list.';}
}
function addSearchedCity() {
 const city=searchResults.find(c=>c.id===document.getElementById('cityResults').value), status=document.getElementById('citySearchMessage');
 if(!city) {status.textContent='Choose a city from the search results.'; return;}
 const already=activeClocks.some(c=>clockId(c)===city.id || (!c.id && c.timezone===city.timezone && clockPoint(c) && Math.abs(clockPoint(c)[0]-city.coordinates[0])<0.03 && Math.abs(clockPoint(c)[1]-city.coordinates[1])<0.03));
 if(already) {status.textContent='This city is already on your dashboard.'; return;}
 const custom=document.getElementById('customName');
 activeClocks.push({...city, name:custom.value.trim() || city.name}); custom.value='';
 renderClocks(); updateMapMarkers(); savePreferences(); status.textContent=`${city.name} added to your dashboard.`;
}
// Wikipedia page titles resolve to exact Wikidata entities; P580/P582 and P276/P17 are refreshed on request.
const sportsEvents = [
 ['AFC Asian Cup 2027','2027 AFC Asian Cup','https://www.the-afc.com/en/national/afc_asian_cup.html'],
 ['Australian Open 2027','2027 Australian Open','https://ausopen.com/'],
 ['Super Bowl LXI','Super Bowl LXI','https://www.nfl.com/super-bowl/'],
 ['UEFA Champions League final 2027','2027 UEFA Champions League final','https://www.uefa.com/uefachampionsleague/'],
 ["FIFA Women’s World Cup 2027",'2027 FIFA Women\'s World Cup','https://www.fifa.com/en/tournaments/womens/womensworldcup/brazil-2027'],
 ['World Athletics Championships 2027','2027 World Athletics Championships','https://worldathletics.org/competitions/world-athletics-championships'],
 ['Ryder Cup 2027','2027 Ryder Cup','https://www.rydercup.com/'],
 ["ICC Men’s Cricket World Cup 2027",'2027 Cricket World Cup','https://www.icc-cricket.com/tournaments/cricketworldcup'],
 ['UEFA EURO 2028','UEFA Euro 2028','https://www.uefa.com/european-qualifiers/'],
 ['Olympic Games LA28','2028 Summer Olympics','https://la28.org/'],
 ['Paralympic Games LA28','2028 Summer Paralympics','https://la28.org/'],
 ['Africa Cup of Nations 2027','2027 Africa Cup of Nations','https://www.cafonline.com/'],
 ['Rugby World Cup 2027','2027 Rugby World Cup','https://www.rugbyworldcup.com/']
];
function claimValues(entity, property) { return (entity?.claims?.[property] || []).filter(c=>c.rank!=='deprecated' && c.mainsnak?.snaktype==='value').map(c=>c.mainsnak.datavalue?.value).filter(Boolean); }
function claimDate(entity, property) {
 const value=claimValues(entity,property)[0];
 if (!value || typeof value.time!=='string' || !value.time.startsWith('+')) return null;
 const m=/^\+(\d{4,})-(\d{2})-(\d{2})T/.exec(value.time); if(!m) return null;
 return value.precision>=11 ? `${m[1]}-${m[2]}-${m[3]}` : value.precision===10 ? `${m[1]}-${m[2]}` : value.precision===9 ? m[1] : null;
}
let sportsRequest=0;
async function loadSports() {
 const request=++sportsRequest, status=document.getElementById('sportsStatus'), container=document.getElementById('sportsResults');
 status.textContent='Retrieving latest event data…'; container.replaceChildren();
 try {
  const titles=sportsEvents.map(e=>e[1]).join('|');
  const pages=await fetchJSON(`https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&redirects=1&titles=${encodeURIComponent(titles)}&format=json&origin=*`);
  const byTitle={}; Object.values(pages.query?.pages || {}).forEach(page=>{if(/^Q\d+$/.test(page.pageprops?.wikibase_item || '')) byTitle[page.title]=page.pageprops.wikibase_item;});
  const redirects={}; [...(pages.query?.normalized || []), ...(pages.query?.redirects || [])].forEach(r=>{redirects[r.from]=r.to;});
  function canonical(title) { const seen=new Set(); while(redirects[title] && !seen.has(title)) {seen.add(title); title=redirects[title];} return title; }
  const ids=sportsEvents.map(e=>byTitle[canonical(e[1])]).filter(Boolean);
  if (!ids.length) throw Error('No event entities returned');
  const response=await fetchJSON(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent([...new Set(ids)].join('|'))}&props=claims&format=json&origin=*`);
  const entities=response.entities || {};
  const locationIds=[...new Set(Object.values(entities).flatMap(entity=>[...claimValues(entity,'P276'),...claimValues(entity,'P17')].map(v=>v.id).filter(Boolean)))];
  let labels={};
  if(locationIds.length) {
   try { const result=await fetchJSON(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(locationIds.slice(0,50).join('|'))}&props=labels&languages=en&format=json&origin=*`); labels=result.entities || {}; } catch (_) { /* dates remain useful if labels are unavailable */ }
  }
  if(request!==sportsRequest) return;
  sportsEvents.forEach(([name,title,official])=>{
   const id=byTitle[canonical(title)], entity=entities[id], start=claimDate(entity,'P580') || claimDate(entity,'P585'), end=claimDate(entity,'P582');
   const locations=[...claimValues(entity,'P276'),...claimValues(entity,'P17')].map(v=>labels[v.id]?.labels?.en?.value).filter(Boolean);
   const card=document.createElement('article'); card.className='sports-event';
   const heading=document.createElement('h4'); heading.textContent=name; card.append(heading);
   const last=end || start; const past=last && /^\d{4}-\d{2}-\d{2}$/.test(last) && last < new Date().toISOString().slice(0,10);
   row(card,'Dates',start ? `${end && end!==start ? `${start} – ${end}` : start}${past ? ' · past date' : ''}` : 'Not available in the feed');
   row(card,'Host location', [...new Set(locations)].join(', ') || 'Not available in the feed');
   if(id) link(card,'Wikidata event data',`https://www.wikidata.org/wiki/${id}`);
   link(card,'Official organiser',official); container.append(card);
  });
  status.textContent=`Wikidata retrieved ${new Date().toLocaleString()}. Dates are calendar dates as supplied, not local kickoff times. Events may change; verify with the organiser.`;
 } catch (_) { if(request===sportsRequest) {status.textContent='Sports data is currently unavailable. Official organiser links are provided below; try refreshing later.'; sportsEvents.forEach(([name,,official])=>{const card=document.createElement('article'); card.className='sports-event'; const h=document.createElement('h4'); h.textContent=name; card.append(h); link(card,'Official organiser',official); container.append(card);});} }
}
document.addEventListener('DOMContentLoaded',()=>{
 document.getElementById('searchCityBtn').addEventListener('click',searchCities);
 document.getElementById('citySearch').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault(); searchCities();}});
 document.getElementById('citySearch').addEventListener('input',()=>{searchGeneration++; searchResults=[]; document.getElementById('cityResults').replaceChildren(new Option('Search to find a location…','')); document.getElementById('citySearchMessage').textContent='';});
 document.getElementById('cityCountryFilter').addEventListener('change',()=>{searchGeneration++; searchResults=[]; document.getElementById('cityResults').replaceChildren(new Option('Search to find a location…','')); document.getElementById('citySearchMessage').textContent='Country filter changed. Search again.';});
 document.getElementById('addCityBtn').addEventListener('click',addSearchedCity);
 document.getElementById('refreshSports').addEventListener('click',loadSports);
 setInterval(()=>{if(document.visibilityState==='visible' && sportsRequest) loadSports();}, 6*60*60*1000);
});
