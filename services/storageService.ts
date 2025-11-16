import { Location, Box, Item } from "../types";

const KEYS = {
  LOCATIONS: 'boxtrack_locations',
  BOXES: 'boxtrack_boxes',
  ITEMS: 'boxtrack_items',
};

const getList = <T>(key: string): T[] => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error parsing storage", e);
    return [];
  }
};

const setList = <T>(key: string, list: T[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {
    console.error("Error saving to storage", e);
  }
};

// Locations
export const getLocations = (): Location[] => getList<Location>(KEYS.LOCATIONS);
export const addLocation = (location: Location) => {
  const list = getLocations();
  list.push(location);
  setList(KEYS.LOCATIONS, list);
};
export const deleteLocation = (locationId: string) => {
  const list = getLocations();
  const updated = list.filter(l => l.id !== locationId);
  setList(KEYS.LOCATIONS, updated);
};

// Items - Defined before Boxes/DeleteBox to ensure availability
export const getItems = (): Item[] => getList<Item>(KEYS.ITEMS);
export const getItemById = (itemId: string): Item | undefined => {
  return getItems().find(item => item.id === itemId);
};
export const addItem = (item: Item) => {
  const list = getItems();
  list.push(item);
  setList(KEYS.ITEMS, list);
};
export const updateItem = (updatedItem: Item) => {
  const list = getItems();
  const updatedList = list.map(item => item.id === updatedItem.id ? updatedItem : item);
  setList(KEYS.ITEMS, updatedList);
};
export const moveItem = (itemId: string, newBoxId: string) => {
  const list = getItems();
  const updated = list.map(item => item.id === itemId ? { ...item, boxId: newBoxId } : item);
  setList(KEYS.ITEMS, updated);
};
export const deleteItem = (itemId: string) => {
  const list = getItems();
  const updated = list.filter(item => item.id !== itemId);
  setList(KEYS.ITEMS, updated);
};

// Boxes
export const getBoxes = (): Box[] => getList<Box>(KEYS.BOXES);
export const addBox = (box: Box) => {
  const list = getBoxes();
  list.push(box);
  setList(KEYS.BOXES, list);
};
export const getBoxById = (id: string): Box | undefined => {
  return getBoxes().find(b => b.id === id);
};
export const updateBox = (updatedBox: Box) => {
  const list = getBoxes();
  const updatedList = list.map(box => box.id === updatedBox.id ? updatedBox : box);
  setList(KEYS.BOXES, updatedList);
};
export const deleteBox = (boxId: string) => {
  // 1. Delete the box
  const boxes = getBoxes();
  const updatedBoxes = boxes.filter(b => b.id !== boxId);
  setList(KEYS.BOXES, updatedBoxes);
  
  // 2. Delete all items associated with this box
  const items = getItems();
  const updatedItems = items.filter(i => i.boxId !== boxId);
  setList(KEYS.ITEMS, updatedItems);
};

// Data Management (Backup/Restore/Export)
export interface AppData {
  locations: Location[];
  boxes: Box[];
  items: Item[];
  timestamp: number;
}

export const getExportData = (): AppData => {
  return {
    locations: getLocations(),
    boxes: getBoxes(),
    items: getItems(),
    timestamp: Date.now(),
  };
};

export const importData = (data: AppData): boolean => {
  try {
    if (!data.locations || !data.boxes || !data.items) return false;
    
    setList(KEYS.LOCATIONS, data.locations);
    setList(KEYS.BOXES, data.boxes);
    setList(KEYS.ITEMS, data.items);
    return true;
  } catch (e) {
    console.error("Import failed", e);
    return false;
  }
};

export const generateHumanReadableInventory = (): string => {
  const locations = getLocations();
  const boxes = getBoxes();
  const items = getItems();

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