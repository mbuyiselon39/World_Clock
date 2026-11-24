const cities = require('../../data/cities.json');
const snapshot = require('../../data/countries.json');
const byCode = Object.fromEntries(snapshot.countries.map(country => [country.cca2, country]));
function slug(value) {return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
const countries = [...new Map(cities.map(city => [city.countryCode, {name:city.country, code:city.countryCode, currency:city.currency, slug:slug(city.country)}])).values()].map(country=>({...country,cities:cities.filter(city=>city.countryCode===country.code),facts:byCode[country.code] ? {capitals:byCode[country.code].capital, languages:Object.values(byCode[country.code].languages || {}), callingCode:byCode[country.code].idd?.suffixes?.length === 1 ? `${byCode[country.code].idd.root || ''}${byCode[country.code].idd.suffixes[0]}` : '', drivingSide:''} : null, retrievedAt:snapshot.retrievedAt}));
module.exports = {cities,countries};
