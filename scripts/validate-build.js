const fs=require('fs'),path=require('path');
const root=path.resolve('_site'), errors=[];
for(const file of ['index.html','sitemap.xml','sitemap-cities.xml','sitemap-countries.xml','sitemap-pages.xml','robots.txt','time/index.html','country/index.html','guides/index.html']) if(!fs.existsSync(path.join(root,file))) errors.push(`Missing ${file}`);
const cities=require('../data/cities.json'); const slugs=new Set();
for(const city of cities){if(slugs.has(city.slug))errors.push(`Duplicate city slug: ${city.slug}`);slugs.add(city.slug);const page=path.join(root,'time',city.slug,'index.html');if(!fs.existsSync(page))errors.push(`Missing city ${city.slug}`);}
for(const sitemap of ['sitemap-cities.xml','sitemap-countries.xml','sitemap-pages.xml']) if(fs.existsSync(path.join(root,sitemap))){const xml=fs.readFileSync(path.join(root,sitemap),'utf8');const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);if(urls.length>50000)errors.push(`${sitemap} exceeds 50,000 URLs`);for(const url of urls){const u=new URL(url);if(u.origin!=='https://worldscope.calculatorflash.com')errors.push(`Unexpected origin: ${url}`);const file=path.join(root,decodeURIComponent(u.pathname),'index.html');if(!fs.existsSync(file))errors.push(`Sitemap target missing: ${url}`);}}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
function count(p){return fs.readdirSync(p,{withFileTypes:true}).reduce((n,x)=>n+(x.isDirectory()?count(path.join(p,x.name)):1),0)}
console.log(`Validated ${cities.length} city pages, sitemap targets and ${count(root)} output files.`);
