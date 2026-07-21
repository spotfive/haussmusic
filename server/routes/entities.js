const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db, getEntityConfig, serializeRow, deserializeRow } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router({ mergeParams: true });

const ADMIN_ONLY_ENTITIES = new Set(['Banner', 'Label', 'Artist', 'AppSettings']);
const nowIso = () => new Date().toISOString();

function requester(req) {
  if (!req.userId) return null;
  return db.prepare('select id, email, role from users where id = ?').get(req.userId);
}

function stripSecrets(entityName, row) {
  if (entityName !== 'User' || !row) return row;
  const { password_hash, ...rest } = row;
  return rest;
}

function canWrite(entityName, req, existingRow) {
  const me = requester(req);
  if (!me) return false;
  if (me.role === 'admin') return true;
  if (ADMIN_ONLY_ENTITIES.has(entityName)) return false;
  if (entityName === 'User') return true; // matches the app's existing "any signed-in user" trust model
  if (!existingRow) return true; // create: any authenticated user
  return existingRow.created_by === me.email;
}

router.get('/:entity', (req, res, next) => {
  try {
    const config = getEntityConfig(req.params.entity);
    const { sort, limit, ...filters } = req.query;
    let sql = `select * from ${config.table}`;
    const clauses = [];
    const params = [];
    for (const [key, value] of Object.entries(filters)) {
      clauses.push(`${key} = ?`);
      params.push(value);
    }
    if (clauses.length) sql += ` where ${clauses.join(' and ')}`;
    if (sort) {
      const desc = sort.startsWith('-');
      sql += ` order by ${desc ? sort.slice(1) : sort} ${desc ? 'desc' : 'asc'}`;
    }
    if (limit) sql += ` limit ${Number(limit)}`;
    const rows = db.prepare(sql).all(...params).map((r) => stripSecrets(req.params.entity, deserializeRow(config, r)));
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:entity/:id', (req, res, next) => {
  try {
    const config = getEntityConfig(req.params.entity);
    const row = db.prepare(`select * from ${config.table} where id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(stripSecrets(req.params.entity, deserializeRow(config, row)));
  } catch (err) { next(err); }
});

router.post('/:entity', requireAuth, (req, res, next) => {
  try {
    const entityName = req.params.entity;
    const config = getEntityConfig(entityName);
    if (!canWrite(entityName, req)) return res.status(403).json({ error: 'Forbidden' });

    const me = requester(req);
    const base = { id: uuidv4(), created_date: nowIso(), updated_date: nowIso(), created_by: me?.email, ...req.body };
    const row = serializeRow(config, base);
    const columns = Object.keys(row);
    db.prepare(`insert into ${config.table} (${columns.join(',')}) values (${columns.map(() => '?').join(',')})`)
      .run(...columns.map((c) => row[c]));
    const created = db.prepare(`select * from ${config.table} where id = ?`).get(base.id);
    res.json(stripSecrets(entityName, deserializeRow(config, created)));
  } catch (err) { next(err); }
});

router.post('/:entity/bulk', requireAuth, (req, res, next) => {
  try {
    const entityName = req.params.entity;
    const config = getEntityConfig(entityName);
    if (!canWrite(entityName, req)) return res.status(403).json({ error: 'Forbidden' });

    const me = requester(req);
    const items = Array.isArray(req.body) ? req.body : [];
    const created = items.map((item) => {
      const base = { id: uuidv4(), created_date: nowIso(), updated_date: nowIso(), created_by: me?.email, ...item };
      const row = serializeRow(config, base);
      const columns = Object.keys(row);
      db.prepare(`insert into ${config.table} (${columns.join(',')}) values (${columns.map(() => '?').join(',')})`)
        .run(...columns.map((c) => row[c]));
      return base.id;
    });
    const rows = created.map((id) => stripSecrets(entityName, deserializeRow(config, db.prepare(`select * from ${config.table} where id = ?`).get(id))));
    res.json(rows);
  } catch (err) { next(err); }
});

router.put('/:entity/:id', requireAuth, (req, res, next) => {
  try {
    const entityName = req.params.entity;
    const config = getEntityConfig(entityName);
    const existing = db.prepare(`select * from ${config.table} where id = ?`).get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (!canWrite(entityName, req, existing)) return res.status(403).json({ error: 'Forbidden' });

    const me = requester(req);
    const patch = { ...req.body };
    delete patch.id;
    if (entityName === 'User' && me.role !== 'admin') {
      delete patch.role;
      delete patch.password_hash;
      delete patch.email;
    }
    const row = serializeRow(config, patch);
    const columns = Object.keys(row);
    if (columns.length) {
      row.updated_date = nowIso();
      const setClause = [...columns, 'updated_date'].map((c) => `${c} = ?`).join(', ');
      db.prepare(`update ${config.table} set ${setClause} where id = ?`).run(...columns.map((c) => row[c]), row.updated_date, req.params.id);
    }
    const updated = db.prepare(`select * from ${config.table} where id = ?`).get(req.params.id);
    res.json(stripSecrets(entityName, deserializeRow(config, updated)));
  } catch (err) { next(err); }
});

router.delete('/:entity/:id', requireAuth, (req, res, next) => {
  try {
    const entityName = req.params.entity;
    const config = getEntityConfig(entityName);
    const existing = db.prepare(`select * from ${config.table} where id = ?`).get(req.params.id);
    if (!existing) return res.json({ success: true });
    if (!canWrite(entityName, req, existing)) return res.status(403).json({ error: 'Forbidden' });

    db.prepare(`delete from ${config.table} where id = ?`).run(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
