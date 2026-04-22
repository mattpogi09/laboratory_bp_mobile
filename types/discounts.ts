export type Discount = {
  id: number;
  name: string;
  rate: number;
  description: string;
  is_active: boolean;
  created_at: string;
};

export type PhilHealthDiscountRule = {
  id: number;
  rule_type: 'category' | 'test';
  target_category: string | null;
  target_lab_test_id: number | null;
  target_lab_test_name: string | null;
  discount_rate: number;
  sort_order: number;
  is_active: boolean;
};

export type PhilHealthPlan = {
  id: number;
  name: string;
  coverage_rate: number;
  other_tests_discount_rate: number;
  description: string;
  is_active: boolean;
  free_test_ids: number[];
  free_tests: { id: number; name: string; category: string }[];
  discount_rules: PhilHealthDiscountRule[];
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
