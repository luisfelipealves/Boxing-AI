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
  // photoUrl removed as requested - only used for temporary analysis
  createdAt: number;
}

export interface AIAnalysisResult {
  name: string;
  description: string;
  material: string;
  color: string;
}