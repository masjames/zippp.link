export type LineItem = {
  description: string | null;
  qty: number | null;
  unit_price: number | null;
  amount: number | null;
};

export type Receipt = {
  merchant: string | null;
  date: string | null;
  currency: string | null;
  line_items: LineItem[];
  subtotal: number | null;
  tax: number | null;
  total: number | null;
};

export type ExtractTimings = {
  model_ms: number;
  server_ms: number;
};

export type ExtractSuccess = {
  ok: true;
  receipt: Receipt;
  timings: ExtractTimings;
};

export type ExtractFailure = {
  ok: false;
  error: string;
};

export type ExtractResponse = ExtractSuccess | ExtractFailure;
