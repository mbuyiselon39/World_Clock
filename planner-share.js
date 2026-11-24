/* A shared meeting is an explicit, read-only URL snapshot; it never changes saved clocks. */
function escapeICSText(value) { return String(value).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;'); }
function icsDate(date) { return date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'); }
function foldICSLine(line) { let result='', length=0; for (const char of line) {const size=new TextEncoder().encode(char).length; if(length+size>75) {result+='\r\n '; length=1;} result+=char; length+=size;} return result; }
function buildMeetingICS(start, description, now=new Date()) {
 const end=new Date(start.getTime()+3600000), uid=`${start.getTime()}-${Math.random().toString(36).slice(2)}@worldscope.calculatorflash.com`;
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//WorldScope//Meeting Planner//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${uid}`,`DTSTAMP:${icsDate(now)}`,`DTSTART:${icsDate(start)}`,`DTEND:${icsDate(end)}`,'SUMMARY:WorldScope meeting',`DESCRIPTION:${escapeICSText(description)}`,'END:VEVENT','END:VCALENDAR',''].map(foldICSLine).join('\r\n');
}
function meetingDescription(start, clocks) { return ['WorldScope meeting',...clocks.map(c=>`${c.name}: ${formatAt(start,c.timezone)}`),'Please confirm availability and local holidays.'].join('\n'); }
function meetingPayload(start, clocks) { return {v:1, start:start.toISOString(), clocks:clocks.map(c=>({name:c.name,timezone:c.timezone}))}; }
function validMeeting(payload) {
 if (!payload || payload.v!==1 || typeof payload.start!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(payload.start) || !Array.isArray(payload.clocks) || !payload.clocks.length || payload.clocks.length>20) return false;
 const date=new Date(payload.start); if (!Number.isFinite(date.getTime()) || date.toISOString()!==payload.start) return false;
 return payload.clocks.every(c=>{if(!c || typeof c.name!=='string' || !c.name.trim() || c.name.length>80 || typeof c.timezone!=='string' || c.timezone.length>100)return false;try {new Intl.DateTimeFormat('en',{timeZone:c.timezone});return true;}catch(_){return false;}});
}
function meetingURL(start, clocks) { const url=new URL('/',location.href); url.searchParams.set('meeting',JSON.stringify(meetingPayload(start,clocks))); url.hash='planning'; return url.href; }
function downloadMeeting(start, clocks) {const blob=new Blob([buildMeetingICS(start,meetingDescription(start,clocks))],{type:'text/calendar;charset=utf-8'}), url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url;a.download='worldscope-meeting.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function addMeetingActions(container,start,clocks) {
 const actions=document.createElement('div');actions.className='meeting-actions';
 const download=document.createElement('button');download.type='button';download.className='outline-link';download.textContent='Download .ics';download.addEventListener('click',()=>downloadMeeting(start,clocks));actions.append(download);
 const copy=document.createElement('button');copy.type='button';copy.className='outline-link';copy.textContent='Copy invite';
 const status=document.createElement('p');status.className='search-help';status.setAttribute('role','status');
 copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(meetingDescription(start,clocks));status.textContent='Invite text copied.';}catch(_){status.textContent='Copy unavailable; select the meeting times shown above.';}});actions.append(copy);
 const share=document.createElement('button');share.type='button';share.className='outline-link';share.textContent='Create share link';
 share.addEventListener('click',()=>{if(clocks.length>20){status.textContent='Share links support up to 20 locations.';return;}const value=meetingURL(start,clocks);if(value.length>4000){status.textContent='This link is too long. Use fewer or shorter labels.';return;}const input=document.createElement('input');input.type='text';input.value=value;input.readOnly=true;input.setAttribute('aria-label','Shareable meeting link');actions.append(input);input.select();status.textContent='Copy the selected link. It includes your location labels and the meeting time.';share.disabled=true;});actions.append(share,status);container.append(actions);
}
document.addEventListener('DOMContentLoaded',()=>{const value=new URL(location.href).searchParams.get('meeting');if(!value)return;const out=document.getElementById('sharedMeeting');try{if(value.length>4000)throw Error();const payload=JSON.parse(value);if(!validMeeting(payload))throw Error();const date=new Date(payload.start), title=document.createElement('strong');title.textContent='Shared meeting · one hour';out.append(title);const text=document.createElement('p');text.textContent=meetingDescription(date,payload.clocks);text.style.whiteSpace='pre-line';out.append(text);addMeetingActions(out,date,payload.clocks);}catch(_){out.textContent='This meeting link is invalid or unsupported. Your saved clocks were not changed.';}});
