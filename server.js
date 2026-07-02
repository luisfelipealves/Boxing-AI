import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3001;
const DB_FILE = path.join(__dirname, 'data', 'boxtrack.sqlite');

app.use(cors());
app.use(express.json());

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new DatabaseSync(DB_FILE);

db.exec(`
  CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS boxes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    box_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    material TEXT,
    color TEXT,
    created_at INTEGER NOT NULL
  );
`);

const parseBody = (req) => req.body ?? {};

const run = (sql, params = []) => db.prepare(sql).run(...params);
const query = (sql, params = []) => db.prepare(sql).all(...params);
const getSingle = (sql, params = []) => query(sql, params)[0];
const getUserId = (req) => {
  const body = parseBody(req);
  return body.user_id || body.userId || 'local-user';
};

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/locations', (_req, res) => {
  res.json(query('SELECT * FROM locations ORDER BY created_at ASC'));
});

app.get('/locations/:id', (req, res) => {
  const location = getSingle('SELECT * FROM locations WHERE id = ?', [req.params.id]);
  if (!location) {
    res.status(404).json({ error: 'Location not found' });
    return;
  }
  res.json(location);
});

app.post('/locations', (req, res) => {
  const body = parseBody(req);
  const id = body.id || randomUUID();
  const userId = getUserId(req);
  const { name, description } = body;

  if (!name || !String(name).trim()) {
    res.status(400).json({ error: 'Location name is required' });
    return;
  }

  try {
    run('INSERT INTO locations (id, user_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)', [id, userId, name, description, Date.now()]);
    res.status(201).json({ id, user_id: userId, name, description, created_at: Date.now() });
  } catch (error) {
    console.error('Failed to create location', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

app.put('/locations/:id', (req, res) => {
  const { name, description } = parseBody(req);
  run('UPDATE locations SET name = ?, description = ? WHERE id = ?', [name, description, req.params.id]);
  res.json(getSingle('SELECT * FROM locations WHERE id = ?', [req.params.id]));
});

app.delete('/locations/:id', (req, res) => {
  run('DELETE FROM locations WHERE id = ?', [req.params.id]);
  res.status(204).send();
});

app.get('/boxes', (_req, res) => {
  res.json(query('SELECT * FROM boxes ORDER BY created_at ASC'));
});

app.post('/boxes', (req, res) => {
  const { id, user_id, location_id, name, description } = parseBody(req);
  run('INSERT INTO boxes (id, user_id, location_id, name, description, created_at) VALUES (?, ?, ?, ?, ?, ?)', [id, user_id, location_id, name, description, Date.now()]);
  res.status(201).json({ id, user_id, location_id, name, description, created_at: Date.now() });
});

app.put('/boxes/:id', (req, res) => {
  const { location_id, name, description } = parseBody(req);
  run('UPDATE boxes SET location_id = ?, name = ?, description = ? WHERE id = ?', [location_id, name, description, req.params.id]);
  res.json(getSingle('SELECT * FROM boxes WHERE id = ?', [req.params.id]));
});

app.delete('/boxes/:id', (req, res) => {
  run('DELETE FROM boxes WHERE id = ?', [req.params.id]);
  res.status(204).send();
});

app.get('/items', (_req, res) => {
  res.json(query('SELECT * FROM items ORDER BY created_at DESC'));
});

app.get('/items/box/:boxId', (req, res) => {
  res.json(query('SELECT * FROM items WHERE box_id = ? ORDER BY created_at DESC', [req.params.boxId]));
});

app.post('/items', (req, res) => {
  const { id, user_id, box_id, name, description, material, color } = parseBody(req);
  run('INSERT INTO items (id, user_id, box_id, name, description, material, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, user_id, box_id, name, description, material, color, Date.now()]);
  res.status(201).json({ id, user_id, box_id, name, description, material, color, created_at: Date.now() });
});

app.put('/items/:id', (req, res) => {
  const { name, description, material, color } = parseBody(req);
  run('UPDATE items SET name = ?, description = ?, material = ?, color = ? WHERE id = ?', [name, description, material, color, req.params.id]);
  res.json(getSingle('SELECT * FROM items WHERE id = ?', [req.params.id]));
});

app.put('/items/:id/move', (req, res) => {
  const { box_id } = parseBody(req);
  run('UPDATE items SET box_id = ? WHERE id = ?', [box_id, req.params.id]);
  res.json(getSingle('SELECT * FROM items WHERE id = ?', [req.params.id]));
});

app.delete('/items/:id', (req, res) => {
  run('DELETE FROM items WHERE id = ?', [req.params.id]);
  res.status(204).send();
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Local API listening on port ${PORT}`);
});
