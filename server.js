import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3001);
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data', 'boxtrack.sqlite');
const createMemoryStore = () => {
  const state = {
    locations: [],
    boxes: [],
    items: [],
  };

  const cloneItems = (items) => items.map((item) => ({ ...item }));

  return {
    kind: 'memory',
    getLocations: () => cloneItems(state.locations),
    getLocation: (id) => state.locations.find((item) => item.id === id),
    createLocation: (location) => {
      state.locations.push(location);
      return location;
    },
    updateLocation: (id, updates) => {
      state.locations = state.locations.map((item) => (item.id === id ? { ...item, ...updates } : item));
      return state.locations.find((item) => item.id === id);
    },
    deleteLocation: (id) => {
      state.locations = state.locations.filter((item) => item.id !== id);
    },
    getBoxes: () => cloneItems(state.boxes),
    createBox: (box) => {
      state.boxes.push(box);
      return box;
    },
    updateBox: (id, updates) => {
      state.boxes = state.boxes.map((item) => (item.id === id ? { ...item, ...updates } : item));
      return state.boxes.find((item) => item.id === id);
    },
    deleteBox: (id) => {
      state.boxes = state.boxes.filter((item) => item.id !== id);
    },
    getItems: () => cloneItems(state.items),
    getItemsByBox: (boxId) => cloneItems(state.items.filter((item) => item.box_id === boxId)),
    createItem: (item) => {
      state.items.push(item);
      return item;
    },
    updateItem: (id, updates) => {
      state.items = state.items.map((item) => (item.id === id ? { ...item, ...updates } : item));
      return state.items.find((item) => item.id === id);
    },
    moveItem: (id, boxId) => {
      const updated = state.items.find((item) => item.id === id);
      if (!updated) return undefined;
      state.items = state.items.map((item) => (item.id === id ? { ...item, box_id: boxId } : item));
      return state.items.find((item) => item.id === id);
    },
    deleteItem: (id) => {
      state.items = state.items.filter((item) => item.id !== id);
    },
  };
};

const createSqliteStore = async (dbFile) => {
  let DatabaseSync;
  try {
    ({ DatabaseSync } = await import('node:sqlite'));
  } catch (error) {
    throw new Error(`SQLite module unavailable: ${error.message}`);
  }

  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  const db = new DatabaseSync(dbFile);

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

  const run = (sql, params = []) => db.prepare(sql).run(...params);
  const query = (sql, params = []) => db.prepare(sql).all(...params);
  const getSingle = (sql, params = []) => query(sql, params)[0];

  return {
    kind: 'sqlite',
    getLocations: () => query('SELECT * FROM locations ORDER BY created_at ASC'),
    getLocation: (id) => getSingle('SELECT * FROM locations WHERE id = ?', [id]),
    createLocation: (location) => {
      run('INSERT INTO locations (id, user_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)', [location.id, location.user_id, location.name, location.description, location.created_at]);
      return location;
    },
    updateLocation: (id, updates) => {
      const { name, description } = updates;
      run('UPDATE locations SET name = ?, description = ? WHERE id = ?', [name, description, id]);
      return getSingle('SELECT * FROM locations WHERE id = ?', [id]);
    },
    deleteLocation: (id) => {
      run('DELETE FROM locations WHERE id = ?', [id]);
    },
    getBoxes: () => query('SELECT * FROM boxes ORDER BY created_at ASC'),
    createBox: (box) => {
      run('INSERT INTO boxes (id, user_id, location_id, name, description, created_at) VALUES (?, ?, ?, ?, ?, ?)', [box.id, box.user_id, box.location_id, box.name, box.description, box.created_at]);
      return box;
    },
    updateBox: (id, updates) => {
      const { location_id, name, description } = updates;
      run('UPDATE boxes SET location_id = ?, name = ?, description = ? WHERE id = ?', [location_id, name, description, id]);
      return getSingle('SELECT * FROM boxes WHERE id = ?', [id]);
    },
    deleteBox: (id) => {
      run('DELETE FROM boxes WHERE id = ?', [id]);
    },
    getItems: () => query('SELECT * FROM items ORDER BY created_at DESC'),
    getItemsByBox: (boxId) => query('SELECT * FROM items WHERE box_id = ? ORDER BY created_at DESC', [boxId]),
    createItem: (item) => {
      run('INSERT INTO items (id, user_id, box_id, name, description, material, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [item.id, item.user_id, item.box_id, item.name, item.description, item.material, item.color, item.created_at]);
      return item;
    },
    updateItem: (id, updates) => {
      const { name, description, material, color } = updates;
      run('UPDATE items SET name = ?, description = ?, material = ?, color = ? WHERE id = ?', [name, description, material, color, id]);
      return getSingle('SELECT * FROM items WHERE id = ?', [id]);
    },
    moveItem: (id, boxId) => {
      run('UPDATE items SET box_id = ? WHERE id = ?', [boxId, id]);
      return getSingle('SELECT * FROM items WHERE id = ?', [id]);
    },
    deleteItem: (id) => {
      run('DELETE FROM items WHERE id = ?', [id]);
    },
  };
};

const createDataStore = async (options = {}) => {
  if (options.forceMemory) {
    throw new Error('Forced memory fallback');
  }

  try {
    return await createSqliteStore(options.dbFile || DB_FILE);
  } catch (error) {
    console.warn('SQLite is unavailable, falling back to in-memory storage.', error.message);
    return createMemoryStore();
  }
};

const parseBody = (req) => req.body ?? {};
const getUserId = (req) => {
  const body = parseBody(req);
  return body.user_id || body.userId || 'local-user';
};

const createApp = async (store) => {
  if (!store) {
    store = await createDataStore();
  }

  const app = express();
  const apiRouter = express.Router();

  app.use(cors());
  app.use(express.json());
  app.locals.store = store;

  apiRouter.get('/health', (req, res) => res.json({ ok: true, database: req.app.locals.store.kind || 'memory' }));

  apiRouter.get('/locations', (req, res) => {
    res.json(req.app.locals.store.getLocations());
  });

  apiRouter.get('/locations/:id', (req, res) => {
    const location = req.app.locals.store.getLocation(req.params.id);
    if (!location) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }
    res.json(location);
  });

  apiRouter.post('/locations', (req, res) => {
    const body = parseBody(req);
    const id = body.id || randomUUID();
    const userId = getUserId(req);
    const { name, description } = body;

    if (!name || !String(name).trim()) {
      res.status(400).json({ error: 'Location name is required' });
      return;
    }

    try {
      const created = req.app.locals.store.createLocation({ id, user_id: userId, name, description, created_at: Date.now() });
      res.status(201).json(created);
    } catch (error) {
      console.error('Failed to create location', error);
      res.status(500).json({ error: 'Failed to create location' });
    }
  });

  apiRouter.put('/locations/:id', (req, res) => {
    const { name, description } = parseBody(req);
    const updated = req.app.locals.store.updateLocation(req.params.id, { name, description });
    res.json(updated);
  });

  apiRouter.delete('/locations/:id', (req, res) => {
    req.app.locals.store.deleteLocation(req.params.id);
    res.status(204).send();
  });

  apiRouter.get('/boxes', (req, res) => {
    res.json(req.app.locals.store.getBoxes());
  });

  apiRouter.post('/boxes', (req, res) => {
    const { id, user_id, location_id, name, description } = parseBody(req);
    const created = req.app.locals.store.createBox({ id, user_id, location_id, name, description, created_at: Date.now() });
    res.status(201).json(created);
  });

  apiRouter.put('/boxes/:id', (req, res) => {
    const { location_id, name, description } = parseBody(req);
    const updated = req.app.locals.store.updateBox(req.params.id, { location_id, name, description });
    res.json(updated);
  });

  apiRouter.delete('/boxes/:id', (req, res) => {
    req.app.locals.store.deleteBox(req.params.id);
    res.status(204).send();
  });

  apiRouter.get('/items', (req, res) => {
    res.json(req.app.locals.store.getItems());
  });

  apiRouter.get('/items/box/:boxId', (req, res) => {
    res.json(req.app.locals.store.getItemsByBox(req.params.boxId));
  });

  apiRouter.post('/items', (req, res) => {
    const { id, user_id, box_id, name, description, material, color } = parseBody(req);
    const created = req.app.locals.store.createItem({ id, user_id, box_id, name, description, material, color, created_at: Date.now() });
    res.status(201).json(created);
  });

  apiRouter.put('/items/:id', (req, res) => {
    const { name, description, material, color } = parseBody(req);
    const updated = req.app.locals.store.updateItem(req.params.id, { name, description, material, color });
    res.json(updated);
  });

  apiRouter.put('/items/:id/move', (req, res) => {
    const { box_id } = parseBody(req);
    const updated = req.app.locals.store.moveItem(req.params.id, box_id);
    res.json(updated);
  });

  apiRouter.delete('/items/:id', (req, res) => {
    req.app.locals.store.deleteItem(req.params.id);
    res.status(204).send();
  });

  app.use('/api', apiRouter);
  app.use(apiRouter);

  apiRouter.use((err, req, res, next) => {
    console.error('API Router Error:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: err?.message || 'Internal Server Error' });
  });

  app.use((err, req, res, next) => {
    console.error('Express App Error:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: err?.message || 'Internal Server Error' });
  });

  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });

  return app;
};

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  createApp().then((app) => {
    app.listen(PORT, () => {
      console.log(`Local API listening on port ${PORT}`);
    });
  }).catch((error) => {
    console.error('Failed to start application', error);
    process.exit(1);
  });
}

export { createApp, createDataStore, createMemoryStore };
