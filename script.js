const defaults = [
    { timezone: 'America/New_York', name: 'New York' },
    { timezone: 'Europe/London', name: 'London' },
    { timezone: 'Asia/Tokyo', name: 'Tokyo' },
    { timezone: 'Australia/Sydney', name: 'Sydney' }
];
let activeClocks = defaults.map(clock => ({ ...clock }));
let map;
const coordinates = {
    'America/New_York':[40.71,-74.01], 'America/Chicago':[41.88,-87.63], 'America/Denver':[39.74,-104.99], 'America/Los_Angeles':[34.05,-118.24], 'America/Toronto':[43.65,-79.38], 'America/Vancouver':[49.28,-123.12], 'America/Mexico_City':[19.43,-99.13],
    'Europe/London':[51.51,-0.13], 'Europe/Paris':[48.86,2.35], 'Europe/Berlin':[52.52,13.4], 'Europe/Rome':[41.9,12.5], 'Europe/Madrid':[40.42,-3.7], 'Europe/Moscow':[55.76,37.62],
    'Asia/Tokyo':[35.69,139.69], 'Asia/Shanghai':[31.23,121.47], 'Asia/Hong_Kong':[22.32,114.17], 'Asia/Singapore':[1.35,103.82], 'Asia/Dubai':[25.2,55.27], 'Asia/Kolkata':[19.08,72.88], 'Asia/Seoul':[37.57,126.98],
    'Australia/Sydney':[-33.87,151.21], 'Australia/Melbourne':[-37.81,144.96], 'Pacific/Auckland':[-36.85,174.76], 'America/Sao_Paulo':[-23.55,-46.63], 'America/Buenos_Aires':[-34.6,-58.38], 'America/Santiago':[-33.45,-70.67], 'Africa/Cairo':[30.04,31.24], 'Africa/Johannesburg':[-26.2,28.05], 'Africa/Lagos':[6.52,3.38]
};
function clockId(clock) { return clock.id || 'tz:' + clock.timezone; }
function clockPoint(clock) { return Array.isArray(clock.coordinates) && clock.coordinates.length === 2 && clock.coordinates.every(Number.isFinite) && Math.abs(clock.coordinates[0]) <= 90 && Math.abs(clock.coordinates[1]) <= 180 ? clock.coordinates : (!clock.id ? coordinates[clock.timezone] : null); }
function savePreferences() {
    try {
        localStorage.setItem('activeClocks', JSON.stringify(activeClocks));
        localStorage.setItem('theme', document.body.classList.contains('dark-theme'));
    } catch (_) { /* The dashboard still works when storage is unavailable. */ }
}
function loadPreferences() {
    try {
        const saved = JSON.parse(localStorage.getItem('activeClocks'));
        if (Array.isArray(saved)) activeClocks = saved.filter(c => {
            if (!c || typeof c.name !== 'string' || typeof c.timezone !== 'string') return false;
            try { new Intl.DateTimeFormat('en', { timeZone: c.timezone }); return true; } catch (_) { return false; }
        });
        if (localStorage.getItem('theme') !== 'false') document.body.classList.add('dark-theme');
    } catch (_) { /* Ignore corrupt or inaccessible saved preferences. */ }
    updateThemeButton();
}
function updateThemeButton() {
    const dark = document.body.classList.contains('dark-theme');
    const button = document.getElementById('themeToggle');
    button.querySelector('i').className = dark ? 'fas fa-sun' : 'fas fa-moon';
    button.querySelector('span').textContent = dark ? 'Light Mode' : 'Dark Mode';
}
function timeDifference(timezone, now) {
    const parts = new Intl.DateTimeFormat('en-US', {timeZone: timezone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'}).formatToParts(now);
    const p = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const targetOffset = Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(now.getTime() / 1000) * 1000) / 60000);
    const diff = targetOffset + now.getTimezoneOffset();
    if (!diff) return 'Same time as local';
    const hours = Math.floor(Math.abs(diff) / 60), minutes = Math.abs(diff) % 60;
    return `${hours ? hours + 'h' : ''}${hours && minutes ? ' ' : ''}${minutes ? minutes + 'm' : ''} ${diff > 0 ? 'ahead' : 'behind'}`;
}
function createClockElement(clock, index) {
    const card = document.createElement('article');
    card.className = 'clock';
    card.dataset.timezone = clock.timezone;
    card.dataset.clockId = clockId(clock);
    card.innerHTML = `<div class="card-top"><span class="card-number">LOCATION / ${String(index + 1).padStart(2, '0')}</span><div class="clock-actions"><button class="btn-icon favorite" type="button"><i></i></button><button class="btn-icon remove" type="button"><i class="fas fa-times"></i></button></div></div><div class="city"></div><div class="timezone"></div><div class="clock-middle"><div><div class="time"></div><div class="date"></div></div><div class="analog-clock" aria-hidden="true"><div class="dial-inner"></div><div class="hour-hand"></div><div class="minute-hand"></div><div class="second-hand"></div><div class="clock-center"></div></div></div><div class="clock-footer"><span class="time-difference"></span><span class="day-status card-live">LIVE</span></div>`;
    card.querySelector('.city').textContent = clock.name;
    card.querySelector('.timezone').textContent = clock.timezone.replaceAll('_', ' ');
    const fav = card.querySelector('.favorite');
    function setFavorite() {
        fav.querySelector('i').className = clock.favorite ? 'fas fa-star' : 'far fa-star';
        fav.classList.toggle('is-favorite', !!clock.favorite);
        fav.setAttribute('aria-label', `${clock.favorite ? 'Remove' : 'Add'} ${clock.name} ${clock.favorite ? 'from' : 'to'} favorites`);
        fav.setAttribute('aria-pressed', !!clock.favorite);
    }
    setFavorite();
    fav.addEventListener('click', () => { clock.favorite = !clock.favorite; setFavorite(); savePreferences(); });
    const remove = card.querySelector('.remove');
    remove.setAttribute('aria-label', `Remove ${clock.name} clock`);
    remove.addEventListener('click', () => { activeClocks = activeClocks.filter(c => c !== clock); renderClocks(); updateMapMarkers(); savePreferences(); });
    return card;
}
function renderClocks() {
    const container = document.getElementById('clocksContainer');
    container.replaceChildren(...activeClocks.map(createClockElement));
    document.getElementById('emptyState').hidden = activeClocks.length > 0;
    updateClocks();
    document.dispatchEvent(new Event('clocksChanged'));
}
function updateClocks() {
    const now = new Date();
    document.querySelectorAll('.clock').forEach(card => {
        const tz = card.dataset.timezone;
        const parts = new Intl.DateTimeFormat('en-US', {timeZone:tz, hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'}).formatToParts(now);
        const p = Object.fromEntries(parts.map(part => [part.type, part.value]));
        card.querySelector('.time').classList.toggle('format-12', typeof getClockFormat === 'function' && getClockFormat() === '12');
        card.querySelector('.time').textContent = typeof getClockFormat === 'function' && getClockFormat() === '12'
            ? `${String((+p.hour % 12) || 12).padStart(2, '0')}:${p.minute}:${p.second} ${+p.hour < 12 ? 'AM' : 'PM'}`
            : `${p.hour}:${p.minute}:${p.second}`;
        card.querySelector('.date').textContent = new Intl.DateTimeFormat('en-US', {timeZone:tz, weekday:'long', month:'short', day:'numeric'}).format(now);
        card.querySelector('.time-difference').textContent = timeDifference(tz, now);
        if (typeof solarStatus === 'function') card.querySelector('.day-status').textContent = solarStatus(activeClocks.find(clock => clockId(clock) === card.dataset.clockId), now);
        card.querySelector('.hour-hand').style.transform = `rotate(${(+p.hour % 12) * 30 + +p.minute * .5}deg)`;
        card.querySelector('.minute-hand').style.transform = `rotate(${+p.minute * 6}deg)`;
        card.querySelector('.second-hand').style.transform = `rotate(${+p.second * 6}deg)`;
    });
    document.getElementById('localTime').textContent = now.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
}
function updateMapMarkers() {
    if (!map) return;
    map.markers.forEach(marker => marker.remove());
    map.markers = [];
    activeClocks.forEach(clock => {
        const point = clockPoint(clock);
        if (!point) return;
        const popup = document.createElement('div');
        const name = document.createElement('strong'); name.textContent = clock.name;
        popup.append(name, document.createElement('br'), document.createTextNode(clock.timezone));
        map.markers.push(L.marker(point).addTo(map).bindPopup(popup));
    });
}
function initializeMap() {
    if (typeof L === 'undefined') { document.getElementById('mapFallback').hidden = false; return; }
    try {
        map = L.map('world-map', {scrollWheelZoom:false}).setView([20, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom:19 }).addTo(map);
        map.markers = []; updateMapMarkers();
    } catch (_) { map = null; document.getElementById('mapFallback').hidden = false; }
}
document.addEventListener('DOMContentLoaded', () => {
    loadPreferences(); renderClocks(); initializeMap(); setInterval(updateClocks, 1000);
    document.getElementById('themeToggle').addEventListener('click', () => { document.body.classList.toggle('dark-theme'); updateThemeButton(); savePreferences(); });
    document.getElementById('addClockBtn').addEventListener('click', () => {
        const select = document.getElementById('timezoneSelect'), input = document.getElementById('customName'), message = document.getElementById('formMessage');
        if (!select.value) { message.textContent = 'Please choose a city or time zone.'; select.focus(); return; }
        if (activeClocks.some(c => c.timezone === select.value)) { message.textContent = 'This time zone is already on your dashboard.'; return; }
        activeClocks.push({timezone:select.value, name:input.value.trim() || select.selectedOptions[0].textContent});
        select.value = ''; input.value = ''; message.textContent = 'Location added to your dashboard.';
        renderClocks(); updateMapMarkers(); savePreferences();
    });
});
