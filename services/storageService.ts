import { Location, Box, Item, AppData } from "../types";

// In a real app, this would be configured via environment variables.
// For this demo, we use a mock local storage approach simulated via API calls pattern
// but falling back to localStorage if the API isn't real, or we just mock it completely here.
// Since this is a frontend-only demo mostly, we'll wrap localStorage with Promises to simulate async API.

const DELAY = 200; // simulate network latency

const wait = () => new Promise(resolve => setTimeout(resolve, DELAY));

const getStored = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const setStored = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Locations
export const getLocations = async (): Promise<Location[]> => {
  await wait();
  return getStored<Location>('locations');
};

export const addLocation = async (location: Omit<Location, 'id'>): Promise<Location> => {
  await wait();
  const locations = getStored<Location>('locations');
  const newLoc = { ...location, id: crypto.randomUUID() };
  locations.push(newLoc);
  setStored('locations', locations);
  return newLoc;
};

export const deleteLocation = async (locationId: string): Promise<void> => {
  await wait();
  const locations = getStored<Location>('locations');
  setStored('locations', locations.filter(l => l.id !== locationId));
};

// Items
export const getItems = async (): Promise<Item[]> => {
  await wait();
  return getStored<Item>('items');
};

export const getItemById = async (itemId: string): Promise<Item | undefined> => {
  await wait();
  const items = getStored<Item>('items');
  return items.find(i => i.id === itemId);
};

export const addItem = async (item: Omit<Item, 'id' | 'createdAt'>): Promise<Item> => {
  await wait();
  const items = getStored<Item>('items');
  const newItem = { ...item, id: crypto.randomUUID(), createdAt: Date.now() };
  items.push(newItem);
  setStored('items', items);
  return newItem;
};

export const updateItem = async (updatedItem: Item): Promise<Item> => {
  await wait();
  const items = getStored<Item>('items');
  const index = items.findIndex(i => i.id === updatedItem.id);
  if (index !== -1) {
    items[index] = updatedItem;
    setStored('items', items);
  }
  return updatedItem;
};

export const moveItem = async (itemId: string, newBoxId: string): Promise<Item> => {
  await wait();
  const items = getStored<Item>('items');
  const index = items.findIndex(i => i.id === itemId);
  if (index !== -1) {
    items[index].boxId = newBoxId;
    setStored('items', items);
    return items[index];
  }
  throw new Error("Item not found");
};

export const deleteItem = async (itemId: string): Promise<void> => {
  await wait();
  const items = getStored<Item>('items');
  setStored('items', items.filter(i => i.id !== itemId));
};

// Boxes
export const getBoxes = async (): Promise<Box[]> => {
  await wait();
  return getStored<Box>('boxes');
};

export const addBox = async (box: Omit<Box, 'id'>): Promise<Box> => {
  await wait();
  const boxes = getStored<Box>('boxes');
  const newBox = { ...box, id: crypto.randomUUID() };
  boxes.push(newBox);
  setStored('boxes', boxes);
  return newBox;
};

export const getBoxById = async (id: string): Promise<Box | undefined> => {
  await wait();
  const boxes = getStored<Box>('boxes');
  return boxes.find(b => b.id === id);
};

export const updateBox = async (updatedBox: Box): Promise<Box> => {
  await wait();
  const boxes = getStored<Box>('boxes');
  const index = boxes.findIndex(b => b.id === updatedBox.id);
  if (index !== -1) {
    boxes[index] = updatedBox;
    setStored('boxes', boxes);
  }
  return updatedBox;
};

export const deleteBox = async (boxId: string): Promise<void> => {
  await wait();
  // Delete box
  const boxes = getStored<Box>('boxes');
  setStored('boxes', boxes.filter(b => b.id !== boxId));
  
  // Cascade delete items in box
  const items = getStored<Item>('items');
  setStored('items', items.filter(i => i.boxId !== boxId));
};

// Data Management
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
  await wait();
  try {
    if (data.locations) setStored('locations', data.locations);
    if (data.boxes) setStored('boxes', data.boxes);
    if (data.items) setStored('items', data.items);
    return { success: true };
  } catch (e) {
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