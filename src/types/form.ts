export interface TripFormData {
  to_city: string;
  start_date: string;
  end_date: string;
  days: number;
  people_count: number;
  preferences: string[];
  avoid: string[];
  notes: string;
}

export const DEFAULT_FORM: TripFormData = {
  to_city: "",
  start_date: "",
  end_date: "",
  days: 3,
  people_count: 1,
  preferences: [],
  avoid: [],
  notes: "",
};
