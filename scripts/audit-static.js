const fs=require('node:fs'), path=require('node:path'), {JSDOM}=require('jsdom');
const root=path.resolve('_site'), origin='https://worldscope.calculatorflash.com';
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const html=walk(root).filter(f=>f.endsWith('.html')), errors=[], docCache=new Map();
function doc(file){if(!docCache.has(file))docCache.set(file,new JSDOM(fs.readFileSync(file,'utf8')).window.document);return docCache.get(file);}
for(const file of html){
 const relative=path.relative(root,file).replace(/\\/g,'/'), pathname=relative==='index.html' ? '/' : '/'+relative.replace(/index\.html$/,'');
 const d=doc(file), canonical=d.querySelector('link[rel="canonical"]');
 if(!canonical || canonical.getAttribute('href')!==origin+pathname)errors.push(`${relative}: invalid canonical`);
 for(const node of d.querySelectorAll('script[type="application/ld+json"]'))try{JSON.parse(node.textContent);}catch(_){errors.push(`${relative}: invalid JSON-LD`);}
 for(const element of d.querySelectorAll('a[href], link[href], script[src], img[src]')){
  const attr=element.hasAttribute('href')?'href':'src', value=element.getAttribute(attr);
  if(!value || value.startsWith('mailto:')||value.startsWith('tel:')||value.startsWith('data:'))continue;
  let url;try{url=new URL(value,origin+pathname);}catch(_){errors.push(`${relative}: invalid URL ${value}`);continue;}
  if(url.origin!==origin)continue;
  let target=path.join(root,decodeURIComponent(url.pathname));
  if(target.endsWith(path.sep)||fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
  if(!fs.existsSync(target)){errors.push(`${relative}: missing ${value}`);continue;}
  if(url.hash && target.endsWith('.html')){const id=decodeURIComponent(url.hash.slice(1));if(id && !doc(target).getElementById(id))errors.push(`${relative}: missing anchor ${value}`);}
 }
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Audited ${html.length} HTML pages: local links, fragments, canonical URLs and JSON-LD are valid.`);
