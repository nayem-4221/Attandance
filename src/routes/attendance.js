const express = require('express');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../util');
const { ymd, getRecord, upsertRecord, history } = require('../data');
const router = express.Router();

function saveDataUrlImage(dataUrl, prefix) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return null;
  const [meta, b64] = dataUrl.split(',');
  const ext = meta.includes('image/png') ? 'png' : meta.includes('image/jpeg') ? 'jpg' : 'png';
  const buf = Buffer.from(b64, 'base64');
  const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const fileName = `${prefix}-${Date.now()}.${ext}`;
  const abs = path.join(uploadsDir, fileName);
  fs.writeFileSync(abs, buf);
  return `/uploads/${fileName}`;
}
function cleanLocation(loc) {
  if (!loc || typeof loc !== 'object') return null;
  const lat = Number(loc.lat), lng = Number(loc.lng);
  const accuracy = loc.accuracy != null ? Number(loc.accuracy) : undefined;
  if (!isFinite(lat) || !isFinite(lng)) return null;
  const out = { lat, lng };
  if (isFinite(accuracy)) out.accuracy = accuracy;
  if (loc.timestamp) out.timestamp = loc.timestamp;
  return out;
}

router.get('/today', requireAuth, (req, res) => {
  const username = req.user.username;
  const rec = getRecord(username, ymd());
  res.json({ date: ymd(), checkInAt: rec?.checkInAt||null, checkOutAt: rec?.checkOutAt||null, checkInPhoto: rec?.checkInPhoto||null, checkOutPhoto: rec?.checkOutPhoto||null, checkInLoc: rec?.checkInLoc||null, checkOutLoc: rec?.checkOutLoc||null });
});

router.get('/history', requireAuth, (req, res) => {
  const items = history(req.user.username, 60);
  res.json({ items });
});

router.post('/check-in', requireAuth, (req, res) => {
  const username = req.user.username; const today = ymd();
  const existing = getRecord(username, today);
  if (existing?.checkInAt && !existing?.checkOutAt) return res.status(409).json({ error: 'Already checked in' });
  const photoUrl = saveDataUrlImage(req.body.photoDataUrl, `${username}-in`);
  const loc = cleanLocation(req.body.location);
  const now = new Date().toISOString();
  const rec = upsertRecord(username, today, { checkInAt: now, checkInPhoto: photoUrl || existing?.checkInPhoto || null, checkInLoc: loc || existing?.checkInLoc || null });
  res.json({ ok: true, record: rec });
});

router.post('/check-out', requireAuth, (req, res) => {
  const username = req.user.username; const today = ymd();
  const existing = getRecord(username, today);
  if (!existing?.checkInAt) return res.status(400).json({ error: 'Must check in first' });
  if (existing?.checkOutAt) return res.status(409).json({ error: 'Already checked out' });
  const photoUrl = saveDataUrlImage(req.body.photoDataUrl, `${username}-out`);
  const loc = cleanLocation(req.body.location);
  const now = new Date().toISOString();
  const rec = upsertRecord(username, today, { checkOutAt: now, checkOutPhoto: photoUrl || existing?.checkOutPhoto || null, checkOutLoc: loc || existing?.checkOutLoc || null });
  res.json({ ok: true, record: rec });
});

module.exports = { attendanceRouter: router };
