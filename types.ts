export interface Location {
  id: string;
  name: string;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Box {
  id: string;
  /** Human-facing sequential number used on printed labels. */
  boxNumber?: number;
  locationId: string;
  /** Category assigned to the container. Optional for backwards-compatible imports. */
  categoryId?: string;
  name: string;
  description?: string;
}

export interface Item {
  id: string;
  boxId: string;
  name: string;
  description?: string;
  material?: string;
  color?: string;
  createdAt: number;
}

export interface AIAnalysisResult {
  name: string;
  description: string;
  material: string;
  color: string;
}

export interface AppData {
  locations: Location[];
  categories?: Category[];
  boxes: Box[];
  items: Item[];
  timestamp: number;
}
