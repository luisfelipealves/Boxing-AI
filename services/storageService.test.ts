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
  getCategories,
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

    const categories = await getCategories();
    expect(categories.map(category => category.name)).toEqual(['Caixa', 'Saco', 'Mala']);
    
    // Create
    const box = await addBox({ locationId: loc.id, categoryId: categories[1].id, name: 'Summer Clothes', description: 'T-shirts and shorts' });
    expect(box.id).toBeDefined();
    expect(box.boxNumber).toBe(1);
    expect(box.locationId).toBe(loc.id);
    expect(box.categoryId).toBe('saco');
    expect(box.name).toBe('Summer Clothes');

    // List
    let boxes = await getBoxes();
    expect(boxes).toHaveLength(1);
    expect(boxes[0].name).toBe('Summer Clothes');
    expect(boxes[0].categoryId).toBe('saco');

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

  it('blocks deleting a location that still has boxes and preserves dependents', async () => {
    const loc = await addLocation({ name: 'Garage' });
    const otherLoc = await addLocation({ name: 'Closet' });
    const blockedBox = await addBox({ locationId: loc.id, name: 'Tools' });
    const secondBlockedBox = await addBox({ locationId: loc.id, name: 'Paint' });
    const otherBox = await addBox({ locationId: otherLoc.id, name: 'Shoes' });
    const item = await addItem({ boxId: blockedBox.id, name: 'Hammer' });

    await expect(deleteLocation(loc.id)).rejects.toMatchObject({
      code: 'DELETE_BLOCKED_BY_DEPENDENCIES',
      entity: 'location',
      dependency: 'boxes',
      count: 2,
    });

    expect(await getLocationById(loc.id)).toEqual(loc);
    expect(await getBoxById(blockedBox.id)).toEqual(blockedBox);
    expect(await getBoxById(secondBlockedBox.id)).toEqual(secondBlockedBox);
    expect(await getBoxById(otherBox.id)).toEqual(otherBox);
    expect(await getItemsByBox(blockedBox.id)).toEqual([item]);
  });

  it('deletes an empty location without orphaning boxes', async () => {
    const emptyLoc = await addLocation({ name: 'Empty Garage' });
    const occupiedLoc = await addLocation({ name: 'Closet' });
    const remainingBox = await addBox({ locationId: occupiedLoc.id, name: 'Shoes' });

    await deleteLocation(emptyLoc.id);

    expect(await getLocationById(emptyLoc.id)).toBeUndefined();
    expect(await getLocations()).toEqual([occupiedLoc]);
    expect(await getBoxes()).toEqual([remainingBox]);
  });

  it('blocks deleting a box that still has items and preserves dependents', async () => {
    const loc = await addLocation({ name: 'Garage' });
    const blockedBox = await addBox({ locationId: loc.id, name: 'Tools' });
    const otherBox = await addBox({ locationId: loc.id, name: 'Empty' });
    await addItem({ boxId: blockedBox.id, name: 'Hammer' });
    await addItem({ boxId: blockedBox.id, name: 'Nails' });

    await expect(deleteBox(blockedBox.id)).rejects.toMatchObject({
      code: 'DELETE_BLOCKED_BY_DEPENDENCIES',
      entity: 'box',
      dependency: 'items',
      count: 2,
    });

    expect(await getBoxById(blockedBox.id)).toEqual(blockedBox);
    expect(await getBoxById(otherBox.id)).toEqual(otherBox);
    const preservedItems = await getItemsByBox(blockedBox.id);
    expect(preservedItems).toHaveLength(2);
    expect(preservedItems.map(item => item.name).sort()).toEqual(['Hammer', 'Nails']);
  });

  it('deletes an empty box without orphaning items', async () => {
    const loc = await addLocation({ name: 'Garage' });
    const emptyBox = await addBox({ locationId: loc.id, name: 'Empty' });
    const occupiedBox = await addBox({ locationId: loc.id, name: 'Tools' });
    const item = await addItem({ boxId: occupiedBox.id, name: 'Hammer' });

    await deleteBox(emptyBox.id);

    expect(await getBoxById(emptyBox.id)).toBeUndefined();
    expect(await getBoxes()).toEqual([occupiedBox]);
    expect(await getItems()).toEqual([item]);
  });

  it('rejects creating a box with an unknown location or category without persisting it', async () => {
    const loc = await addLocation({ name: 'Garage' });

    await expect(addBox({ locationId: 'missing-location', name: 'Orphan box' })).rejects.toMatchObject({
      code: 'INVALID_REFERENCE',
      entity: 'box',
      field: 'locationId',
      referenceEntity: 'location',
      referenceId: 'missing-location',
    });

    await expect(addBox({ locationId: loc.id, categoryId: 'missing-category', name: 'Invalid category box' })).rejects.toMatchObject({
      code: 'INVALID_REFERENCE',
      entity: 'box',
      field: 'categoryId',
      referenceEntity: 'category',
      referenceId: 'missing-category',
    });

    expect(await getBoxes()).toEqual([]);
  });

  it('rejects updating a missing box or changing a box to unknown references without mutating it', async () => {
    const loc = await addLocation({ name: 'Garage' });
    const categories = await getCategories();
    const box = await addBox({ locationId: loc.id, categoryId: categories[0].id, name: 'Tools' });

    await expect(updateBox({ ...box, id: 'missing-box', name: 'Ghost' })).rejects.toMatchObject({
      code: 'ENTITY_NOT_FOUND',
      entity: 'box',
      entityId: 'missing-box',
    });

    await expect(updateBox({ ...box, locationId: 'missing-location' })).rejects.toMatchObject({
      code: 'INVALID_REFERENCE',
      entity: 'box',
      field: 'locationId',
      referenceEntity: 'location',
      referenceId: 'missing-location',
    });

    await expect(updateBox({ ...box, categoryId: 'missing-category' })).rejects.toMatchObject({
      code: 'INVALID_REFERENCE',
      entity: 'box',
      field: 'categoryId',
      referenceEntity: 'category',
      referenceId: 'missing-category',
    });

    expect(await getBoxById(box.id)).toEqual(box);
  });

  it('rejects creating an item for an unknown box without persisting it', async () => {
    await expect(addItem({ boxId: 'missing-box', name: 'Orphan item' })).rejects.toMatchObject({
      code: 'INVALID_REFERENCE',
      entity: 'item',
      field: 'boxId',
      referenceEntity: 'box',
      referenceId: 'missing-box',
    });

    expect(await getItems()).toEqual([]);
  });

  it('rejects updating or moving missing items and rejects moving to an unknown box without mutating it', async () => {
    const loc = await addLocation({ name: 'Garage' });
    const box = await addBox({ locationId: loc.id, name: 'Tools' });
    const item = await addItem({ boxId: box.id, name: 'Hammer' });

    await expect(updateItem({ ...item, id: 'missing-item', name: 'Ghost hammer' })).rejects.toMatchObject({
      code: 'ENTITY_NOT_FOUND',
      entity: 'item',
      entityId: 'missing-item',
    });

    await expect(moveItem('missing-item', box.id)).rejects.toMatchObject({
      code: 'ENTITY_NOT_FOUND',
      entity: 'item',
      entityId: 'missing-item',
    });

    await expect(moveItem(item.id, 'missing-box')).rejects.toMatchObject({
      code: 'INVALID_REFERENCE',
      entity: 'item',
      field: 'boxId',
      referenceEntity: 'box',
      referenceId: 'missing-box',
    });

    expect(await getItemById(item.id)).toEqual(item);
    expect(await getItemsByBox(box.id)).toEqual([item]);
  });

  it('can perform items CRUD operations', async () => {
    const loc = await addLocation({ name: 'Garage' });
    const box = await addBox({ locationId: loc.id, name: 'Box 1' });
    const box2 = await addBox({ locationId: loc.id, name: 'Box 2' });
    expect(box2.boxNumber).toBe(2);

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
