const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'attendance.json');

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify([]), 'utf-8');
}

function loadAll() { ensure(); return JSON.parse(fs.readFileSync(FILE, 'utf-8')); }
function saveAll(items) { ensure(); fs.writeFileSync(FILE, JSON.stringify(items, null, 2), 'utf-8'); }
function ymd(date = new Date()) { return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,10); }

function getRecord(username, dateStr = ymd()) {
  const all = loadAll();
  return all.find(r => r.username === username && r.date === dateStr) || null;
}
function upsertRecord(username, dateStr = ymd(), patch = {}) {
  const all = loadAll();
  const i = all.findIndex(r => r.username === username && r.date === dateStr);
  if (i >= 0) all[i] = { ...all[i], ...patch };
  else all.push({ username, date: dateStr, ...patch });
  saveAll(all);
  return i>=0 ? all[i] : all[all.length-1];
}
function history(username, limit=30) {
  return loadAll().filter(r=>r.username===username).sort((a,b)=>a.date<b.date?1:-1).slice(0,limit);
}
function durationSeconds(rec) {
  if (!rec?.checkInAt) return 0;
  const s = new Date(rec.checkInAt).getTime();
  const e = rec.checkOutAt ? new Date(rec.checkOutAt).getTime() : Date.now();
  return Math.max(0, Math.floor((e-s)/1000));
}
function hms(secs){const h=Math.floor(secs/3600),m=Math.floor((secs%3600)/60),s=secs%60;return [h,m,s].map(n=>String(n).padStart(2,'0')).join(':');}
function listAll({from,to,username}={}){
  return loadAll().filter(r=>{
    if (username && r.username!==username) return false;
    if (from && r.date<from) return false;
    if (to && r.date>to) return false;
    return true;
  }).sort((a,b)=>a.date===b.date? a.username.localeCompare(b.username) : (a.date<b.date?1:-1)).map(r=>{
    const secs = durationSeconds(r);
    return { ...r, durationSeconds: secs, durationHuman: hms(secs) };
  });
}

function deleteRecord(username, dateStr){
  const all = loadAll();
  const idx = all.findIndex(r=>r.username===username && r.date===dateStr);
  if (idx === -1) return false;
  all.splice(idx,1);
  saveAll(all);
  return true;
}

function bulkDelete(items){
  if (!Array.isArray(items)) return { deleted: 0 };
  const all = loadAll();
  let deleted = 0;
  items.forEach(({username, date})=>{
    const idx = all.findIndex(r=>r.username===username && r.date===date);
    if (idx !== -1) { all.splice(idx,1); deleted++; }
  });
  if (deleted) saveAll(all);
  return { deleted };
}

module.exports = { ymd, getRecord, upsertRecord, history, durationSeconds, hms, listAll, deleteRecord, bulkDelete };
