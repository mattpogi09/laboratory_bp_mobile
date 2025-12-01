export type TestItem = {
  id: number;
  patient: string;
  test: string;
  status: string;
  price: number;
  created_at: string;
};

export type SummaryResponse = {
  counts: {
    pending: number;
    processing: number;
    completed: number;
    released: number;
  };
  up_next: {
    id: number;
    patient: string;
    test: string;
    status: string;
    created_at: string;
  }[];
};

export type Meta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};
