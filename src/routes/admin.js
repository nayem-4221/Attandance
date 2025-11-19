const express = require('express');
const { requireAuth, adminOnly } = require('../util');
const { listAll, deleteRecord, bulkDelete } = require('../data');
const { fetchUsersFromApi } = require('./auth');

const router = express.Router();

router.get('/users', requireAuth, adminOnly, async (req, res) => {
  const all = await fetchUsersFromApi();
  const items = all.map(u => ({ username: u.username, role: u.role }));
  res.json({ items, total: items.length });
});

router.get('/attendance', requireAuth, adminOnly, (req, res) => {
  const { dateFrom, dateTo, username } = req.query;
  const items = listAll({ from: dateFrom || undefined, to: dateTo || undefined, username: username || undefined });
  res.json({ items });
});

// Delete an attendance record (by username + date)
router.delete('/attendance', requireAuth, adminOnly, (req, res) => {
  const { username, date } = req.query;
  if (!username || !date) return res.status(400).json({ error: 'username and date required' });
  const ok = deleteRecord(username, date);
  if (!ok) return res.status(404).json({ error: 'Record not found' });
  res.json({ ok: true });
});

router.post('/attendance/bulk-delete', requireAuth, adminOnly, (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'items array required' });
  const result = bulkDelete(items);
  res.json(result);
});

router.get('/attendance/export', requireAuth, adminOnly, (req, res) => {
  const { dateFrom, dateTo, username } = req.query;
  const items = listAll({ from: dateFrom || undefined, to: dateTo || undefined, username: username || undefined });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="attendance_export.csv"');
  const header = ['User','Date','CheckIn','CheckOut','Duration','PhotoIn','PhotoOut','InLat','InLng','OutLat','OutLng'];
  res.write(header.join(',')+'\n');
  items.forEach(r=>{
    const inLat = r.checkInLoc?.lat ?? '';
    const inLng = r.checkInLoc?.lng ?? '';
    const outLat = r.checkOutLoc?.lat ?? '';
    const outLng = r.checkOutLoc?.lng ?? '';
    const row = [r.username, r.date, r.checkInAt||'', r.checkOutAt||'', r.durationHuman||'', r.checkInPhoto||'', r.checkOutPhoto||'', inLat, inLng, outLat, outLng];
    res.write(row.map(v=>String(v).replaceAll('"','""')).map(v=>v.includes(',')?`"${v}"`:v).join(',')+'\n');
  });
  res.end();
});

module.exports = { adminRouter: router };
