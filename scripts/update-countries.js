/* Refresh the bundled, attributed ODbL snapshot from the public GitHub source. */
const fs=require('node:fs');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const run=promisify(execFile);
const target='data/countries.json';
const headers={'User-Agent':'WorldScope-static-build','Accept':'application/vnd.github+json'};
async function requestJSON(url,extra={}) {
 try { const res=await fetch(url,{headers:{...headers,...extra},signal:AbortSignal.timeout(30000)}); if(!res.ok)throw new Error(`GitHub returned HTTP ${res.status}`);return await res.json(); }
 catch (error) {
  // Some restricted build environments permit curl through their proxy but not Node fetch.
  try {const {stdout}=await run('curl',['--fail','--silent','--show-error','--location','--max-time','30','--user-agent',headers['User-Agent'],'--header',`Accept: ${extra.Accept || headers.Accept}`,url],{maxBuffer:5000000});return JSON.parse(stdout);} catch (_) {throw error;}
 }
}
async function main() {
 const commit=await requestJSON('https://api.github.com/repos/mledoze/countries/commits/master');
 if(!/^[0-9a-f]{40}$/.test(commit.sha||''))throw new Error('Invalid source revision');
 const data=await requestJSON(`https://api.github.com/repos/mledoze/countries/contents/countries.json?ref=${commit.sha}`,{'Accept':'application/vnd.github.raw+json'});if(!Array.isArray(data)||data.length<150)throw new Error('Incomplete country response');
 const countries=data.filter(c=>c && /^[A-Z]{2}$/.test(c.cca2||'') && typeof c.name?.common==='string').map(c=>({name:{common:c.name.common,official:typeof c.name.official==='string'?c.name.official:c.name.common},cca2:c.cca2,region:c.region||'',subregion:c.subregion||'',capital:Array.isArray(c.capital)?c.capital:[],area:Number.isFinite(c.area)?c.area:null,languages:c.languages||{},currencies:c.currencies||{},idd:c.idd||{},flag:typeof c.flag==='string'?c.flag:''}));
 if(countries.length<150)throw new Error('Too few valid records');
 const snapshot={source:'https://github.com/mledoze/countries',license:'ODbL-1.0',revision:commit.sha,retrievedAt:new Date().toISOString(),countries};
 const temp=target+'.tmp';fs.writeFileSync(temp,JSON.stringify(snapshot,null,2)+'\n');fs.renameSync(temp,target);console.log(`Updated ${countries.length} countries from ${commit.sha}.`);
}
main().catch(e=>{console.error(`Country snapshot not changed: ${e.message}`);process.exitCode=1;});
