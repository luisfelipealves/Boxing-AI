import { Location, Box, Item, AppData } from "../types";
import { localApi } from "./localApiClient";

const getCurrentUserId = (): string => {
  if (typeof window === 'undefined') return 'local-user';
  const stored = window.localStorage.getItem('boxtrack-local-auth');
  if (!stored) return 'local-user';
  try {
    const parsed = JSON.parse(stored) as { id?: string };
    return parsed.id || 'local-user';
  } catch {
    return 'local-user';
  }
};

// Helpers to map Database (snake_case) to App (camelCase)
const mapLocation = (row: any): Location => ({
  id: row.id,
  user_id: row.user_id,
  name: row.name,
  description: row.description,
});

const mapBox = (row: any): Box => ({
  id: row.id,
  user_id: row.user_id,
  locationId: row.location_id,
  name: row.name,
  description: row.description,
});

const mapItem = (row: any): Item => ({
  id: row.id,
  user_id: row.user_id,
  boxId: row.box_id,
  name: row.name,
  description: row.description,
  material: row.material,
  color: row.color,
  createdAt: new Date(row.created_at).getTime(),
});

// --- LOCATIONS ---

export const getLocations = async (): Promise<Location[]> => {
  const rows = await localApi.get<any[]>('/locations');
  return rows.map(mapLocation);
};

export const addLocation = async (location: Omit<Location, 'id'>): Promise<Location> => {
  const userId = getCurrentUserId();
  const row = await localApi.post<any>('/locations', {
    id: crypto.randomUUID(),
    name: location.name,
    description: location.description,
    user_id: userId,
  });
  return mapLocation(row);
};

export const updateLocation = async (location: Location): Promise<Location> => {
  const row = await localApi.put<any>(`/locations/${location.id}`, {
    name: location.name,
    description: location.description,
  });
  return mapLocation(row);
};

export const deleteLocation = async (locationId: string): Promise<void> => {
  await localApi.delete(`/locations/${locationId}`);
};

export const getLocationById = async (id: string): Promise<Location | undefined> => {
  const rows = await localApi.get<any[]>('/locations');
  const row = rows.find((item) => item.id === id);
  return row ? mapLocation(row) : undefined;
};

// --- BOXES ---

export const getBoxes = async (): Promise<Box[]> => {
  const rows = await localApi.get<any[]>('/boxes');
  return rows.map(mapBox);
};

export const getBoxById = async (id: string): Promise<Box | undefined> => {
  const rows = await localApi.get<any[]>('/boxes');
  const row = rows.find((item) => item.id === id);
  return row ? mapBox(row) : undefined;
};

export const addBox = async (box: Omit<Box, 'id'>): Promise<Box> => {
  const userId = getCurrentUserId();
  const row = await localApi.post<any>('/boxes', {
    id: crypto.randomUUID(),
    name: box.name,
    description: box.description,
    location_id: box.locationId,
    user_id: userId,
  });
  return mapBox(row);
};

export const updateBox = async (updatedBox: Box): Promise<Box> => {
  const row = await localApi.put<any>(`/boxes/${updatedBox.id}`, {
    name: updatedBox.name,
    description: updatedBox.description,
    location_id: updatedBox.locationId,
  });
  return mapBox(row);
};

export const deleteBox = async (boxId: string): Promise<void> => {
  await localApi.delete(`/boxes/${boxId}`);
};

// --- ITEMS ---

export const getItems = async (): Promise<Item[]> => {
  const rows = await localApi.get<any[]>('/items');
  return rows.map(mapItem);
};

export const getItemsByBox = async (boxId: string): Promise<Item[]> => {
  const rows = await localApi.get<any[]>(`/items/box/${boxId}`);
  return rows.map(mapItem);
};

export const getItemById = async (itemId: string): Promise<Item | undefined> => {
  const rows = await localApi.get<any[]>('/items');
  const row = rows.find((item) => item.id === itemId);
  return row ? mapItem(row) : undefined;
};

export const addItem = async (item: Omit<Item, 'id' | 'createdAt'>): Promise<Item> => {
  const userId = getCurrentUserId();
  const row = await localApi.post<any>('/items', {
    id: crypto.randomUUID(),
    box_id: item.boxId,
    name: item.name,
    description: item.description,
    material: item.material,
    color: item.color,
    user_id: userId,
  });
  return mapItem(row);
};

export const updateItem = async (updatedItem: Item): Promise<Item> => {
  const row = await localApi.put<any>(`/items/${updatedItem.id}`, {
    name: updatedItem.name,
    description: updatedItem.description,
    material: updatedItem.material,
    color: updatedItem.color,
  });
  return mapItem(row);
};

export const moveItem = async (itemId: string, newBoxId: string): Promise<Item> => {
  const row = await localApi.put<any>(`/items/${itemId}/move`, { box_id: newBoxId });
  return mapItem(row);
};

export const deleteItem = async (itemId: string): Promise<void> => {
  await localApi.delete(`/items/${itemId}`);
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
    await Promise.all([
      ...data.locations.map((location) => addLocation(location)),
      ...data.boxes.map((box) => addBox(box)),
      ...data.items.map((item) => addItem(item)),
    ]);
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