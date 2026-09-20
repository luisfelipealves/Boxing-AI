import { Location, Box, Item, AppData } from "../types";
import initSqlJs, { Database } from 'sql.js';

const DB_NAME = 'BoxTrackPersonalDB';
const STORE_NAME = 'sqlite';
const KEY = 'database';

let wasmBinary: Uint8Array | undefined;

export const setWasmBinary = (binary: Uint8Array) => {
  wasmBinary = binary;
};

const loadDbFromIndexedDB = (): Promise<Uint8Array | null> => {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const getReq = store.get(KEY);
        getReq.onsuccess = () => {
          resolve(getReq.result || null);
        };
        getReq.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

const saveDbToIndexedDB = (data: Uint8Array): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      resolve();
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const putReq = store.put(data, KEY);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
};

let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;

const createSchema = (db: Database) => {
  db.run(`
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS boxes (
      id TEXT PRIMARY KEY,
      location_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      box_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      material TEXT,
      color TEXT,
      created_at INTEGER NOT NULL
    );
  `);
};

export const initDatabase = async (): Promise<Database> => {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const config = wasmBinary 
      ? { wasmBinary: wasmBinary as any } 
      : { locateFile: (file: string) => `/${file}` };

    const SQL = await initSqlJs(config);
    const savedData = await loadDbFromIndexedDB();
    
    let db: Database;
    if (savedData) {
      try {
        db = new SQL.Database(savedData);
      } catch (e) {
        console.error('Failed to parse saved database, starting a fresh one', e);
        db = new SQL.Database();
        createSchema(db);
      }
    } else {
      db = new SQL.Database();
      createSchema(db);
    }

    dbInstance = db;
    return db;
  })();

  return initPromise;
};

export const getDb = async (): Promise<Database> => {
  if (!dbInstance) {
    await initDatabase();
  }
  return dbInstance!;
};

export const persistDb = async () => {
  if (dbInstance) {
    const data = dbInstance.export();
    await saveDbToIndexedDB(data);
  }
};

export const closeDatabase = () => {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  initPromise = null;
};

// Helpers to map Database (snake_case) to App (camelCase)
const mapLocation = (row: any): Location => ({
  id: row.id,
  name: row.name,
  description: row.description || undefined,
});

const mapBox = (row: any): Box => ({
  id: row.id,
  locationId: row.location_id,
  name: row.name,
  description: row.description || undefined,
});

const mapItem = (row: any): Item => ({
  id: row.id,
  boxId: row.box_id,
  name: row.name,
  description: row.description || undefined,
  material: row.material || undefined,
  color: row.color || undefined,
  createdAt: typeof row.created_at === 'number' ? row.created_at : new Date(row.created_at).getTime(),
});

const selectAll = async (sql: string, params: any[] = []): Promise<any[]> => {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
};

const selectOne = async (sql: string, params: any[] = []): Promise<any | undefined> => {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row: any = undefined;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
};

const executeRun = async (sql: string, params: any[] = []) => {
  const db = await getDb();
  db.run(sql, params);
  await persistDb();
};

// --- LOCATIONS ---

export const getLocations = async (): Promise<Location[]> => {
  const rows = await selectAll('SELECT * FROM locations ORDER BY created_at ASC');
  return rows.map(mapLocation);
};

export const addLocation = async (location: Omit<Location, 'id'>): Promise<Location> => {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  await executeRun(
    'INSERT INTO locations (id, name, description, created_at) VALUES (?, ?, ?, ?)',
    [id, location.name, location.description || null, createdAt]
  );
  return {
    id,
    name: location.name,
    description: location.description,
  };
};

export const updateLocation = async (location: Location): Promise<Location> => {
  await executeRun(
    'UPDATE locations SET name = ?, description = ? WHERE id = ?',
    [location.name, location.description || null, location.id]
  );
  return location;
};

export const deleteLocation = async (locationId: string): Promise<void> => {
  await executeRun('DELETE FROM locations WHERE id = ?', [locationId]);
};

export const getLocationById = async (id: string): Promise<Location | undefined> => {
  const row = await selectOne('SELECT * FROM locations WHERE id = ?', [id]);
  return row ? mapLocation(row) : undefined;
};

// --- BOXES ---

export const getBoxes = async (): Promise<Box[]> => {
  const rows = await selectAll('SELECT * FROM boxes ORDER BY created_at ASC');
  return rows.map(mapBox);
};

export const getBoxById = async (id: string): Promise<Box | undefined> => {
  const row = await selectOne('SELECT * FROM boxes WHERE id = ?', [id]);
  return row ? mapBox(row) : undefined;
};

export const addBox = async (box: Omit<Box, 'id'>): Promise<Box> => {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  await executeRun(
    'INSERT INTO boxes (id, location_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, box.locationId, box.name, box.description || null, createdAt]
  );
  return {
    id,
    locationId: box.locationId,
    name: box.name,
    description: box.description,
  };
};

export const updateBox = async (updatedBox: Box): Promise<Box> => {
  await executeRun(
    'UPDATE boxes SET location_id = ?, name = ?, description = ? WHERE id = ?',
    [updatedBox.locationId, updatedBox.name, updatedBox.description || null, updatedBox.id]
  );
  return updatedBox;
};

export const deleteBox = async (boxId: string): Promise<void> => {
  await executeRun('DELETE FROM boxes WHERE id = ?', [boxId]);
};

// --- ITEMS ---

export const getItems = async (): Promise<Item[]> => {
  const rows = await selectAll('SELECT * FROM items ORDER BY created_at DESC');
  return rows.map(mapItem);
};

export const getItemsByBox = async (boxId: string): Promise<Item[]> => {
  const rows = await selectAll('SELECT * FROM items WHERE box_id = ? ORDER BY created_at DESC', [boxId]);
  return rows.map(mapItem);
};

export const getItemById = async (itemId: string): Promise<Item | undefined> => {
  const row = await selectOne('SELECT * FROM items WHERE id = ?', [itemId]);
  return row ? mapItem(row) : undefined;
};

export const addItem = async (item: Omit<Item, 'id' | 'createdAt'>): Promise<Item> => {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  await executeRun(
    'INSERT INTO items (id, box_id, name, description, material, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, item.boxId, item.name, item.description || null, item.material || null, item.color || null, createdAt]
  );
  return {
    id,
    boxId: item.boxId,
    name: item.name,
    description: item.description,
    material: item.material,
    color: item.color,
    createdAt,
  };
};

export const updateItem = async (updatedItem: Item): Promise<Item> => {
  await executeRun(
    'UPDATE items SET name = ?, description = ?, material = ?, color = ? WHERE id = ?',
    [updatedItem.name, updatedItem.description || null, updatedItem.material || null, updatedItem.color || null, updatedItem.id]
  );
  return updatedItem;
};

export const moveItem = async (itemId: string, newBoxId: string): Promise<Item> => {
  await executeRun(
    'UPDATE items SET box_id = ? WHERE id = ?',
    [newBoxId, itemId]
  );
  const row = await selectOne('SELECT * FROM items WHERE id = ?', [itemId]);
  if (!row) {
    throw new Error(`Item ${itemId} not found after move`);
  }
  return mapItem(row);
};

export const deleteItem = async (itemId: string): Promise<void> => {
  await executeRun('DELETE FROM items WHERE id = ?', [itemId]);
};

// --- DATA MANAGEMENT (Backup/Restore) ---

export const getExportData = async (): Promise<AppData> => {
  const [locations, boxes, items] = await Promise.all([
    getLocations(),
    getBoxes(),
    getItems(),
  ]);
  return {
    locations,
    boxes,
    items,
    timestamp: Date.now(),
  };
};

export const importData = async (data: AppData): Promise<{ success: boolean }> => {
  try {
    const db = await getDb();
    db.run("BEGIN TRANSACTION");
    try {
      db.run("DELETE FROM locations");
      db.run("DELETE FROM boxes");
      db.run("DELETE FROM items");

      for (const loc of data.locations) {
        db.run(
          'INSERT INTO locations (id, name, description, created_at) VALUES (?, ?, ?, ?)',
          [loc.id, loc.name, loc.description || null, Date.now()]
        );
      }
      for (const box of data.boxes) {
        db.run(
          'INSERT INTO boxes (id, location_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)',
          [box.id, box.locationId, box.name, box.description || null, Date.now()]
        );
      }
      for (const item of data.items) {
        db.run(
          'INSERT INTO items (id, box_id, name, description, material, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            item.id,
            item.boxId,
            item.name,
            item.description || null,
            item.material || null,
            item.color || null,
            item.createdAt || Date.now(),
          ]
        );
      }
      db.run("COMMIT");
    } catch (e) {
      db.run("ROLLBACK");
      throw e;
    }
    await persistDb();
    return { success: true };
  } catch (error) {
    console.error('Failed to import data locally', error);
    return { success: false };
  }
};

export const generateHumanReadableInventory = async (): Promise<string> => {
  const [locations, boxes, items] = await Promise.all([
    getLocations(),
    getBoxes(),
    getItems(),
  ]);

  let output = "MY INVENTORY DATA:\n\n";

  if (locations.length === 0) return "Inventory is empty.";

  locations.forEach(loc => {
    output += `📍 LOCATION: ${loc.name}\n`;
    const locBoxes = boxes.filter(b => b.locationId === loc.id);

    if (locBoxes.length === 0) {
      output += `   (No boxes here)\n`;
    } else {
      locBoxes.forEach(box => {
        output += `   📦 BOX: ${box.name} (${box.description || 'No desc'})\n`;
        const boxItems = items.filter(i => i.boxId === box.id);
        if (boxItems.length === 0) {
          output += `      - (Empty)\n`;
        } else {
          boxItems.forEach(item => {
            output += `      - ${item.name} ${item.description ? `(${item.description})` : ''}\n`;
          });
        }
      });
    }
    output += "\n";
  });

  return output;
};
