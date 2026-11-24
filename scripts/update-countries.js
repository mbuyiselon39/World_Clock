/* Optional manual/CI snapshot refresh; never overwrite a working snapshot on failure. */
const fs=require('fs');
const target='data/country-snapshot.json';
async function main(){
 const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),20000);
 try {
  const response=await fetch('https://restcountries.com/v3.1/all?fields=cca2,capital,languages,currencies,idd,car,timezones',{signal:controller.signal}); if(!response.ok)throw Error(`HTTP ${response.status}`);
  const raw=await response.json(); if(!Array.isArray(raw)||raw.length<150)throw Error('Incomplete country response');
  const countries={}; for(const r of raw){if(!/^[A-Z]{2}$/.test(r.cca2||''))continue; countries[r.cca2]={capitals:Array.isArray(r.capital)?r.capital.filter(s=>typeof s==='string'):[],languages:r.languages?Object.values(r.languages).filter(s=>typeof s==='string'):[],currencies:r.currencies?Object.keys(r.currencies):[],callingCode:typeof r.idd?.root==='string' ? r.idd.root+(Array.isArray(r.idd.suffixes)&&r.idd.suffixes.length===1?r.idd.suffixes[0]:'') : '',drivingSide:['left','right'].includes(r.car?.side)?r.car.side:'',timezones:Array.isArray(r.timezones)?r.timezones.filter(s=>typeof s==='string'):[]};}
  if(Object.keys(countries).length<150)throw Error('Too few valid records');
  const temp=target+'.tmp'; fs.writeFileSync(temp,JSON.stringify({source:'REST Countries (https://restcountries.com/)',retrievedAt:new Date().toISOString(),countries},null,2)+'\n');fs.renameSync(temp,target);console.log(`Updated ${Object.keys(countries).length} countries.`);
 } finally {clearTimeout(timer);}
}
main().catch(e=>{console.error(`Country snapshot not changed: ${e.message}`);process.exitCode=1;});
