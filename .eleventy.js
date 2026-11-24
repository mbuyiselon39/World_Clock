module.exports = function(config) {
  for (const file of ['index.html','style.css','script.js','planner-share.js','tools.js','discovery.js','dashboard.js','atlas.js','favicon.svg','social-card.png','robots.txt']) config.addPassthroughCopy(file);
  config.addPassthroughCopy({'site/assets':'assets'});
  config.addPassthroughCopy({'data/countries.json':'data/countries.json'});
  config.addPassthroughCopy({'site/_headers':'_headers'});
  config.addFilter('slug', value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''));
  config.addFilter('json', value => JSON.stringify(value).replace(/</g,'\\u003c'));
  return {dir:{input:'site',output:'_site'},templateFormats:['njk','html'],htmlTemplateEngine:'njk'};
};
