export interface Location {
  id: string;
  name: string;
  description?: string;
}

export interface Box {
  id: string;
  locationId: string;
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
  boxes: Box[];
  items: Item[];
  timestamp: number;
}
