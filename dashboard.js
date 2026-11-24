/* Dashboard preferences and portable, user-controlled backups. */
let clockFormat = '24';
function getClockFormat() { return clockFormat; }
function normalizeBackup(data) {
 if (!data || data.version !== 1 || !Array.isArray(data.clocks) || data.clocks.length > 100) throw new Error('This is not a supported WorldScope backup, or it contains more than 100 clocks.');
 const ids = new Set();
 return data.clocks.map(c => {
  if (!c || typeof c.name !== 'string' || !c.name.trim() || c.name.length > 80 || typeof c.timezone !== 'string' || c.timezone.length > 100) throw new Error('The backup contains an invalid clock.');
  try { new Intl.DateTimeFormat('en', {timeZone:c.timezone}); } catch (_) { throw new Error('The backup contains an unsupported time zone.'); }
  const clock = {name:c.name.trim(), timezone:c.timezone};
  if (c.favorite !== undefined) { if (typeof c.favorite !== 'boolean') throw new Error('The backup contains an invalid favorite.'); clock.favorite=c.favorite; }
  if (c.id !== undefined) {
   if (typeof c.id !== 'string' || !/^geo:\d+$/.test(c.id) || !Array.isArray(c.coordinates) || c.coordinates.length !== 2 || !c.coordinates.every(Number.isFinite) || Math.abs(c.coordinates[0]) > 90 || Math.abs(c.coordinates[1]) > 180 || !/^[A-Z]{2}$/.test(c.countryCode || '') || typeof c.country !== 'string' || !c.country.trim() || c.country.length > 100 || (c.region !== undefined && (typeof c.region !== 'string' || c.region.length > 100))) throw new Error('The backup contains an invalid searched city.');
   Object.assign(clock,{id:c.id,coordinates:[...c.coordinates],countryCode:c.countryCode,country:c.country,region:c.region || ''});
  }
  const id=clock.id || `tz:${clock.timezone}`;
  if (ids.has(id)) throw new Error('The backup contains duplicate locations.');
  ids.add(id); return clock;
 });
}
function exportClocks() {
 const blob=new Blob([JSON.stringify({version:1,clocks:activeClocks}, null, 2)],{type:'application/json'});
 const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download='worldscope-clocks.json'; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
 document.getElementById('backupStatus').textContent='Backup downloaded. It contains your clock names and locations; share it only with people you trust.';
}
async function importClocks(event) {
 const input=event.target, file=input.files?.[0], status=document.getElementById('backupStatus');
 if(!file) return;
 try {
  if(file.size>256000) throw new Error('The backup file is too large (maximum 256 KB).');
  const clocks=normalizeBackup(JSON.parse(await file.text()));
  if(!window.confirm(`Replace your current clocks with ${clocks.length} clock${clocks.length===1?'':'s'} from this backup?`)) { status.textContent='Import cancelled; your clocks are unchanged.'; return; }
  activeClocks=clocks; renderClocks(); updateMapMarkers(); savePreferences(); status.textContent='Clocks imported. Your theme and time format were not changed.';
 } catch(error) { status.textContent=error instanceof SyntaxError ? 'The file is not valid JSON. Your clocks are unchanged.' : `${error.message || 'Could not read this file.'} Your clocks are unchanged.`; }
 finally {input.value='';}
}
document.addEventListener('DOMContentLoaded',()=>{
 const header=document.querySelector('.topbar');
 function setHeaderHeight() { document.documentElement.style.setProperty('--header-height',`${Math.ceil(header.getBoundingClientRect().height)}px`); }
 setHeaderHeight(); if ('ResizeObserver' in window) new ResizeObserver(setHeaderHeight).observe(header); else window.addEventListener('resize',setHeaderHeight);
 try { if(localStorage.getItem('clockFormat')==='12') clockFormat='12'; } catch (_) {}
 const select=document.getElementById('clockFormat'); select.value=clockFormat; updateClocks();
 select.addEventListener('change',()=>{clockFormat=select.value==='12'?'12':'24'; try {localStorage.setItem('clockFormat',clockFormat);} catch (_) {} updateClocks();});
 document.getElementById('exportClocks').addEventListener('click',exportClocks);
 document.getElementById('importClocks').addEventListener('change',importClocks);
});
