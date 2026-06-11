export interface TripFormData {
  to_city: string;
  days: number;
  people_count: number;
  preferences: string[];
  avoid: string[];
  notes: string;
}

export const DEFAULT_FORM: TripFormData = {
  to_city: "",
  days: 3,
  people_count: 1,
  preferences: [],
  avoid: [],
  notes: "",
};
