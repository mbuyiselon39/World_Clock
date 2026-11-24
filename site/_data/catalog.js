const cities = require('../../data/cities.json');
const snapshot = require('../../data/country-snapshot.json');
function slug(value) {return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
const countries = [...new Map(cities.map(city => [city.countryCode, {name:city.country, code:city.countryCode, currency:city.currency, slug:slug(city.country)}])).values()].map(country=>({...country,cities:cities.filter(city=>city.countryCode===country.code),facts:snapshot.countries[country.code], retrievedAt:snapshot.retrievedAt}));
module.exports = {cities,countries};
