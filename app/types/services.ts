export type Service = {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  is_active: boolean;
  created_at: string;
};

export type ServicesResponse = {
  data: Service[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type GroupedServices = {
  [category: string]: Service[];
};

export const SERVICE_CATEGORIES = [
  "Hematology",
  "Clinical Microscopy",
  "Serology/Immunology",
  "Blood Chemistry",
  "Others",
  "Procedure Ultra Sound",
] as const;
