import { Location, Box, Item, AppData } from "../types";
import { supabase } from "./supabaseClient";

// Helper to get current user ID
const getCurrentUserId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");
  return user.id;
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
  // RLS on the server will automatically filter this, but explicit filtering is safe
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data.map(mapLocation);
};

export const addLocation = async (location: Omit<Location, 'id'>): Promise<Location> => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('locations')
    .insert({
      name: location.name,
      description: location.description,
      user_id: userId
    })
    .select()
    .single();

  if (error) throw error;
  return mapLocation(data);
};

export const deleteLocation = async (locationId: string): Promise<void> => {
  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', locationId);

  if (error) throw error;
};

// --- BOXES ---

export const getBoxes = async (): Promise<Box[]> => {
  const { data, error } = await supabase
    .from('boxes')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data.map(mapBox);
};

export const getBoxById = async (id: string): Promise<Box | undefined> => {
  const { data, error } = await supabase
    .from('boxes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return undefined;
  return mapBox(data);
};

export const addBox = async (box: Omit<Box, 'id'>): Promise<Box> => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('boxes')
    .insert({
      name: box.name,
      description: box.description,
      location_id: box.locationId, // Mapping to DB column
      user_id: userId
    })
    .select()
    .single();

  if (error) throw error;
  return mapBox(data);
};

export const updateBox = async (updatedBox: Box): Promise<Box> => {
  const { data, error } = await supabase
    .from('boxes')
    .update({
      name: updatedBox.name,
      description: updatedBox.description,
      location_id: updatedBox.locationId
    })
    .eq('id', updatedBox.id)
    .select()
    .single();

  if (error) throw error;
  return mapBox(data);
};

export const deleteBox = async (boxId: string): Promise<void> => {
  const { error } = await supabase
    .from('boxes')
    .delete()
    .eq('id', boxId);

  if (error) throw error;
};

// --- ITEMS ---

export const getItems = async (): Promise<Item[]> => {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapItem);
};

export const getItemsByBox = async (boxId: string): Promise<Item[]> => {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('box_id', boxId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapItem);
};

export const getItemById = async (itemId: string): Promise<Item | undefined> => {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', itemId)
    .single();

  if (error) return undefined;
  return mapItem(data);
};

export const addItem = async (item: Omit<Item, 'id' | 'createdAt'>): Promise<Item> => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('items')
    .insert({
      box_id: item.boxId,
      name: item.name,
      description: item.description,
      material: item.material,
      color: item.color,
      user_id: userId
    })
    .select()
    .single();

  if (error) throw error;
  return mapItem(data);
};

export const updateItem = async (updatedItem: Item): Promise<Item> => {
  const { data, error } = await supabase
    .from('items')
    .update({
      name: updatedItem.name,
      description: updatedItem.description,
      material: updatedItem.material,
      color: updatedItem.color,
    })
    .eq('id', updatedItem.id)
    .select()
    .single();

  if (error) throw error;
  return mapItem(data);
};

export const moveItem = async (itemId: string, newBoxId: string): Promise<Item> => {
  const { data, error } = await supabase
    .from('items')
    .update({ box_id: newBoxId })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return mapItem(data);
};

export const deleteItem = async (itemId: string): Promise<void> => {
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
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
  console.warn("Bulk import is disabled for Supabase version to prevent data conflicts.");
  return { success: false };
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