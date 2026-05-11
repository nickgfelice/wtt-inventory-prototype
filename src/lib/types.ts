export type Item = {
  id: string;
  name: string;
  category: string;
  location?: string;
  photoUrl: string;
  requiresTracking: boolean;
  checkedOut: boolean;
  checkedOutAt?: number;
  estimatedReturnDate?: string;
  updatedAt: number;
};

export type OptionManagerKind = "category" | "location";

export type ManageActionResult =
  | { ok: true; value: string }
  | { ok: false; error: string };
