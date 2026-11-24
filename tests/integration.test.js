const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom');
const {TextEncoder}=require('node:util');
const wait=()=>new Promise(resolve=>setTimeout(resolve,25));
async function boot(saved) {
 const errors=[], requests=[], virtualConsole=new VirtualConsole();
 virtualConsole.on('jsdomError',err=>errors.push(err));
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://worldscope.calculatorflash.com/',runScripts:'outside-only',virtualConsole});
 const w=dom.window;
 if(saved) {w.localStorage.setItem('activeClocks',saved.clocks); w.localStorage.setItem('theme',saved.theme);}
 w.addEventListener('error',event=>errors.push(event.error || new Error(event.message)));
 await new Promise(resolve=>w.document.addEventListener('DOMContentLoaded',resolve,{once:true}));
 w.TextEncoder=TextEncoder; w.setInterval=()=>0;
 w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.fetch=async url=>{
  requests.push(String(url));
  if(String(url).includes('geocoding-api')) return {ok:true,json:async()=>({results:[{id:3369157,name:'Cape Town',timezone:'Africa/Johannesburg',latitude:-33.9,longitude:18.4,country_code:'ZA',country:'South Africa'}]})};
  if(String(url)==='/data/countries.json') return {ok:true,json:async()=>({retrievedAt:'2026-11-24T00:00:00.000Z',countries:[{name:{common:'South Africa'},cca2:'ZA',region:'Africa',subregion:'Southern Africa',capital:['Pretoria'],area:1221000,flag:'🇿🇦',languages:{eng:'English'},currencies:{ZAR:{name:'South African rand'}}}]})};
  throw new Error('Provider unavailable');
 };
 for(const file of ['script.js','planner-share.js','tools.js','discovery.js','dashboard.js','atlas.js']) vm.runInContext(fs.readFileSync(file,'utf8'),dom.getInternalVMContext(),{filename:file});
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return {dom,w,doc:w.document,requests,errors};
}
(async()=>{
 const {dom,w,doc,requests,errors}=await boot();
 assert.equal(doc.querySelectorAll('.clock').length,4); assert.equal(requests.length,0,'no data requests before user action');
 const format=doc.getElementById('clockFormat');format.value='12';format.dispatchEvent(new w.Event('change'));assert.match(doc.querySelector('.clock .time').textContent,/ (AM|PM)$/);
 const input=doc.getElementById('citySearch');input.value='Cape Town';doc.getElementById('searchCityBtn').click();await wait();
 doc.getElementById('cityResults').value='geo:3369157';doc.getElementById('addCityBtn').click();assert.equal(doc.querySelectorAll('.clock').length,5);
 const select=doc.getElementById('timezoneSelect');select.value='Africa/Johannesburg';doc.getElementById('addClockBtn').click();assert.equal(doc.querySelectorAll('.clock').length,6,'separate cities sharing time zone can be added');
 doc.getElementById('meetingDate').value='2026-01-05';doc.getElementById('findMeetings').click();assert.equal(doc.querySelectorAll('#meetingResults .meeting-actions').length,5);
 doc.getElementById('meetingDate').dispatchEvent(new w.Event('change'));assert.match(doc.getElementById('meetingResults').textContent,/Settings changed/);
 doc.getElementById('reloadAtlas').click();await wait();assert.equal(doc.querySelectorAll('.atlas-card').length,1);assert.equal(doc.getElementById('cityCountryFilter').options.length,2);
 doc.getElementById('loadInsights').click();await wait();assert.match(doc.getElementById('holidayResults').textContent,/unavailable/i);assert.match(doc.getElementById('weatherResults').textContent,/unavailable/i);
 doc.getElementById('loadMap').click();const mapScript=[...doc.querySelectorAll('script[src]')].find(s=>s.src.includes('leaflet.js'));mapScript.dispatchEvent(new w.Event('error'));assert.equal(doc.getElementById('loadMap').disabled,false);assert.equal(doc.getElementById('mapFallback').hidden,false);
 assert.deepEqual(errors.map(e=>e.message),[]);dom.window.close();
 const corrupted=await boot({clocks:'not-json',theme:'false'});assert.equal(corrupted.doc.querySelectorAll('.clock').length,4);assert.equal(corrupted.doc.body.classList.contains('dark-theme'),false,'theme survives corrupt clock data');corrupted.dom.window.close();
 console.log('Dashboard integration tests passed.');
})().catch(err=>{console.error(err);process.exitCode=1;});
