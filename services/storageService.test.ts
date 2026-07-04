import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { 
  setWasmBinary, 
  getLocations, 
  addLocation, 
  updateLocation, 
  deleteLocation, 
  getLocationById,
  getBoxes,
  getBoxById,
  addBox,
  updateBox,
  deleteBox,
  getItems,
  getItemsByBox,
  getItemById,
  addItem,
  updateItem,
  moveItem,
  deleteItem,
  closeDatabase,
  getDb
} from './storageService';

describe('storageService local SQLite integration', () => {
  beforeAll(async () => {
    // Load WASM from node_modules for test environment
    const wasmPath = path.resolve(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm');
    const wasmBinary = new Uint8Array(fs.readFileSync(wasmPath));
    setWasmBinary(wasmBinary);
  });

  beforeEach(async () => {
    // Reset/close any existing database instance to guarantee clean state
    closeDatabase();
    
    // Explicitly initialize database and clear tables to isolate test runs
    const db = await getDb();
    db.run("DELETE FROM locations");
    db.run("DELETE FROM boxes");
    db.run("DELETE FROM items");
  });

  it('can perform locations CRUD operations', async () => {
    // Create
    const loc = await addLocation({ name: 'Garage', description: 'Main storage' });
    expect(loc.id).toBeDefined();
    expect(loc.name).toBe('Garage');
    expect(loc.description).toBe('Main storage');

    // List
    let locations = await getLocations();
    expect(locations).toHaveLength(1);
    expect(locations[0].name).toBe('Garage');

    // Get by ID
    const found = await getLocationById(loc.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Garage');

    // Update
    const updated = await updateLocation({ ...loc, name: 'Garage Updated' });
    expect(updated.name).toBe('Garage Updated');

    const foundUpdated = await getLocationById(loc.id);
    expect(foundUpdated?.name).toBe('Garage Updated');

    // Delete
    await deleteLocation(loc.id);
    locations = await getLocations();
    expect(locations).toHaveLength(0);
  });

  it('can perform boxes CRUD operations', async () => {
    const loc = await addLocation({ name: 'Garage' });
    
    // Create
    const box = await addBox({ locationId: loc.id, name: 'Summer Clothes', description: 'T-shirts and shorts' });
    expect(box.id).toBeDefined();
    expect(box.locationId).toBe(loc.id);
    expect(box.name).toBe('Summer Clothes');

    // List
    let boxes = await getBoxes();
    expect(boxes).toHaveLength(1);
    expect(boxes[0].name).toBe('Summer Clothes');

    // Get by ID
    const found = await getBoxById(box.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Summer Clothes');

    // Update
    const updated = await updateBox({ ...box, name: 'Winter Clothes' });
    expect(updated.name).toBe('Winter Clothes');

    // Delete
    await deleteBox(box.id);
    boxes = await getBoxes();
    expect(boxes).toHaveLength(0);
  });

  it('can perform items CRUD operations', async () => {
    const loc = await addLocation({ name: 'Garage' });
    const box = await addBox({ locationId: loc.id, name: 'Box 1' });
    const box2 = await addBox({ locationId: loc.id, name: 'Box 2' });

    // Create
    const item = await addItem({ boxId: box.id, name: 'Hammer', description: 'Heavy tool', material: 'Steel/Wood', color: 'Brown/Grey' });
    expect(item.id).toBeDefined();
    expect(item.name).toBe('Hammer');
    expect(item.material).toBe('Steel/Wood');

    // List
    let items = await getItems();
    expect(items).toHaveLength(1);

    // List by box
    let boxItems = await getItemsByBox(box.id);
    expect(boxItems).toHaveLength(1);
    expect(boxItems[0].name).toBe('Hammer');

    // Get by ID
    const found = await getItemById(item.id);
    expect(found?.name).toBe('Hammer');

    // Update
    const updated = await updateItem({ ...item, name: 'Claw Hammer' });
    expect(updated.name).toBe('Claw Hammer');

    // Move
    const moved = await moveItem(item.id, box2.id);
    expect(moved.boxId).toBe(box2.id);
    
    expect(await getItemsByBox(box.id)).toHaveLength(0);
    expect(await getItemsByBox(box2.id)).toHaveLength(1);

    // Delete
    await deleteItem(item.id);
    expect(await getItems()).toHaveLength(0);
  });
});
