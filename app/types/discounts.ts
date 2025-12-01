export type Discount = {
  id: number;
  name: string;
  rate: number;
  description: string;
  is_active: boolean;
  created_at: string;
};

export type PhilHealthPlan = {
  id: number;
  name: string;
  coverage_rate: number;
  description: string;
  is_active: boolean;
  created_at: string;
};

export type DiscountsResponse = {
  data: Discount[];
  current_page: number;
  last_page: number;
};

export type PhilHealthPlansResponse = {
  data: PhilHealthPlan[];
  current_page: number;
  last_page: number;
};
