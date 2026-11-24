/* Bundled country directory adapter. Records are treated as data, never HTML. */
const ATLAS_PAGE_SIZE=12;
let atlasCountries=[], atlasPage=0, atlasRequest=0;
function atlasRegionOf(record) {
 const region=record.region || '', sub=record.subregion || '';
 if(region==='Americas') return sub==='South America' ? 'South America' : 'North America';
 return ['Africa','Asia','Europe','Oceania','Antarctic'].includes(region) ? region : 'Other';
}
function normalizeCountry(record) {
 if (!record || typeof record.name?.common!=='string' || !/^[A-Z]{2}$/.test(record.cca2 || '')) return null;
 const str = v => typeof v==='string' ? v : '';
 const strings = v => Array.isArray(v) ? v.filter(x=>typeof x==='string') : [];
 return {code:record.cca2, name:record.name.common, official:str(record.name.official), region:atlasRegionOf(record), subregion:str(record.subregion), capitals:strings(record.capital), population:Number.isFinite(record.population)&&record.population>=0 ? record.population : null, area:Number.isFinite(record.area)&&record.area>=0 ? record.area : null, languages:record.languages && typeof record.languages==='object' ? Object.values(record.languages).filter(x=>typeof x==='string') : [], flag:str(record.flags?.png), flagEmoji:str(record.flag), crest:str(record.coatOfArms?.png)};
}
function countryFilter(records, query, region) {
 const q=query.trim().toLocaleLowerCase();
 return records.filter(c=>(!region || c.region===region) && (!q || [c.name,c.official,...c.capitals,c.code].some(v=>v.toLocaleLowerCase().includes(q))));
}
function safeImage(url) { try { const parsed=new URL(url); return parsed.protocol==='https:' ? parsed.href : ''; } catch (_) { return ''; } }
function atlasText(tag, text, className) { const el=document.createElement(tag); el.textContent=text; if(className) el.className=className; return el; }
function countryCard(country) {
 const card=document.createElement('article'); card.className='atlas-card';
 const head=document.createElement('div'); head.className='atlas-card-head';
 const flag=safeImage(country.flag);
 if(flag) {const img=document.createElement('img'); img.src=flag; img.alt=`Flag of ${country.name}`; img.loading='lazy'; img.className='atlas-flag'; head.append(img);} else if (country.flagEmoji) { const emoji=atlasText('span',country.flagEmoji,'atlas-flag-emoji'); emoji.setAttribute('role','img'); emoji.setAttribute('aria-label',`Flag of ${country.name}`); head.append(emoji); }
 const title=atlasText('h3',country.name); head.append(title); card.append(head);
 const lines=[['Region',country.subregion || country.region],['Capital',country.capitals.join(', ') || 'Not available'],['Population',country.population===null ? 'Not available' : new Intl.NumberFormat().format(country.population)],['Area',country.area===null ? 'Not available' : `${new Intl.NumberFormat().format(country.area)} km²`],['Languages',country.languages.join(', ') || 'Not available']];
 lines.forEach(([name,value])=>row(card,name,value));
 const crest=safeImage(country.crest);
 const symbol=document.createElement('div'); symbol.className='atlas-symbol';
 if(crest) {const img=document.createElement('img'); img.src=crest; img.alt=`Coat of arms of ${country.name}`; img.loading='lazy'; symbol.append(img,atlasText('span','Coat of arms'));} else symbol.append(atlasText('span','Coat of arms not available'));
 card.append(symbol);
 const button=atlasText('button','Find a city ↗','outline-link atlas-city-button'); button.type='button';
 button.addEventListener('click',()=>{const filter=document.getElementById('cityCountryFilter'); filter.value=country.code; filter.dispatchEvent(new Event('change')); document.getElementById('add-clock').scrollIntoView({behavior:'smooth'}); document.getElementById('citySearch').focus({preventScroll:true});});
 card.append(button);
 link(card,'World Bank country indicators',`https://data.worldbank.org/country/${encodeURIComponent(country.code)}`);
 link(card,'Explore the country on Wikipedia',`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(country.name)}`);
 return card;
}
function renderAtlas() {
 const results=document.getElementById('atlasResults'), query=document.getElementById('atlasSearch').value, region=document.getElementById('atlasRegion').value;
 const matches=countryFilter(atlasCountries,query,region), pages=Math.max(1,Math.ceil(matches.length/ATLAS_PAGE_SIZE)); atlasPage=Math.min(atlasPage,pages-1);
 results.replaceChildren(...matches.slice(atlasPage*ATLAS_PAGE_SIZE,(atlasPage+1)*ATLAS_PAGE_SIZE).map(countryCard));
 if(!matches.length) results.append(atlasText('p',atlasCountries.length ? 'No matching countries or territories.' : 'Load countries to browse the directory.','search-help'));
 document.getElementById('atlasPage').textContent=`${matches.length} results · Page ${atlasPage+1} of ${pages}`;
 document.getElementById('atlasPrev').disabled=atlasPage===0; document.getElementById('atlasNext').disabled=atlasPage>=pages-1;
}
async function loadAtlas() {
 const generation=++atlasRequest, status=document.getElementById('atlasStatus'); status.textContent='Loading the bundled country directory…';
 try {
  const snapshot=await fetchJSON('/data/countries.json'); const data=snapshot.countries;
  if(generation!==atlasRequest) return;
  if(!Array.isArray(data)) throw new Error('Invalid response');
  const seen=new Set(), records=data.map(normalizeCountry).filter(c=>{if(!c||seen.has(c.code))return false;seen.add(c.code);return true;}).sort((a,b)=>a.name.localeCompare(b.name));
  if(!records.length) throw new Error('No country data');
  atlasCountries=records; atlasPage=0; document.getElementById('reloadAtlas').textContent='Refresh countries';
  const filter=document.getElementById('cityCountryFilter'), previous=filter.value; filter.replaceChildren(new Option('All countries',''));
  atlasCountries.forEach(c=>filter.add(new Option(c.name,c.code))); if(atlasCountries.some(c=>c.code===previous)) filter.value=previous;
  status.textContent=`${atlasCountries.length} countries and territories · snapshot retrieved ${snapshot.retrievedAt ? new Date(snapshot.retrievedAt).toLocaleDateString() : 'date unavailable'}. Population and coat of arms are not included in this dataset.`;
  renderAtlas();
 } catch (_) { if(generation===atlasRequest) {status.textContent=atlasCountries.length ? 'Refresh failed. Showing previously loaded country data; try again.' : 'Country directory unavailable. Check your connection and try Refresh countries.'; renderAtlas();} }
}
document.addEventListener('DOMContentLoaded',()=>{
 document.getElementById('reloadAtlas').addEventListener('click',loadAtlas);
 ['atlasSearch','atlasRegion'].forEach(id=>document.getElementById(id).addEventListener(id==='atlasSearch'?'input':'change',()=>{atlasPage=0; renderAtlas();}));
 document.getElementById('atlasPrev').addEventListener('click',()=>{atlasPage=Math.max(0,atlasPage-1); renderAtlas();});
 document.getElementById('atlasNext').addEventListener('click',()=>{atlasPage++; renderAtlas();});
 renderAtlas();
});
