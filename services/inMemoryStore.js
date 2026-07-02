const createStore = () => {
  const state = {
    locations: [],
    boxes: [],
    items: [],
  };

  return {
    getLocations: () => state.locations,
    addLocation: (location) => {
      state.locations.push(location);
      return location;
    },
    deleteLocation: (id) => {
      state.locations = state.locations.filter((item) => item.id !== id);
    },
    getBoxes: () => state.boxes,
    addBox: (box) => {
      state.boxes.push(box);
      return box;
    },
    updateBox: (box) => {
      state.boxes = state.boxes.map((item) => (item.id === box.id ? box : item));
      return box;
    },
    deleteBox: (id) => {
      state.boxes = state.boxes.filter((item) => item.id !== id);
    },
    getItems: () => state.items,
    getItemsByBox: (boxId) => state.items.filter((item) => item.box_id === boxId),
    addItem: (item) => {
      state.items.push(item);
      return item;
    },
    updateItem: (item) => {
      state.items = state.items.map((entry) => (entry.id === item.id ? item : entry));
      return item;
    },
    moveItem: (itemId, boxId) => {
      state.items = state.items.map((item) => (item.id === itemId ? { ...item, box_id: boxId } : item));
      return state.items.find((item) => item.id === itemId);
    },
    deleteItem: (id) => {
      state.items = state.items.filter((item) => item.id !== id);
    },
  };
};

export const store = createStore();
