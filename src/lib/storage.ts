export type Item = {
  id: string;            // e.g., WTT-000001
  name: string;
  category: string;
  location?: string;
  condition?: "Excellent" | "Good" | "Fair" | "Needs Repair";
  checkedOut: boolean;
  updatedAt: number;
};

const STORAGE_KEY = "wtt_items_v1";
const COUNTER_KEY = "wtt_item_counter_v1";

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function seedIfEmpty() {
  const items = readJSON<Item[]>(STORAGE_KEY, []);
  if (items.length > 0) return;

  const now = Date.now();
  const seeded: Item[] = [
    { id: "WTT-000001", name: "Vintage Typewriter", category: "Typewriters", location: "Aisle 1", condition: "Good", checkedOut: false, updatedAt: now },
    { id: "WTT-000002", name: "Old Film Camera", category: "Cameras", location: "Aisle 2", condition: "Fair", checkedOut: true, updatedAt: now },
    { id: "WTT-000003", name: "Brass Candelabra", category: "Set Pieces", location: "Aisle 3", condition: "Good", checkedOut: false, updatedAt: now },
  ];

  writeJSON(STORAGE_KEY, seeded);
  localStorage.setItem(COUNTER_KEY, "3");
}

export function getItems(): Item[] {
  return readJSON<Item[]>(STORAGE_KEY, []);
}

export function getItemById(id: string): Item | undefined {
  return getItems().find((x) => x.id === id);
}

export function nextItemId(): string {
  const current = parseInt(localStorage.getItem(COUNTER_KEY) ?? "0", 10) || 0;
  const next = current + 1;
  localStorage.setItem(COUNTER_KEY, String(next));
  return `WTT-${String(next).padStart(6, "0")}`;
}

export function upsertItem(item: Item) {
  const items = getItems();
  const idx = items.findIndex((x) => x.id === item.id);
  const updated = { ...item, updatedAt: Date.now() };

  if (idx >= 0) items[idx] = updated;
  else items.unshift(updated);

  writeJSON(STORAGE_KEY, items);
}

export function setCheckedOut(id: string, checkedOut: boolean) {
  const items = getItems();
  const idx = items.findIndex((x) => x.id === id);
  if (idx < 0) return;

  items[idx] = { ...items[idx], checkedOut, updatedAt: Date.now() };
  writeJSON(STORAGE_KEY, items);
}

// NEW: replace all items (used for demo mode controls)
export function setItems(items: Item[]) {
  writeJSON(STORAGE_KEY, items);
  const maxId = items.reduce((max, item) => {
    const match = item.id.match(/(\d+)$/);
    const numeric = match ? parseInt(match[1], 10) : 0;
    return Math.max(max, numeric);
  }, 0);
  localStorage.setItem(COUNTER_KEY, String(maxId));
}

// NEW: clear all items (used for demo mode controls)
export function clearItems() {
  writeJSON(STORAGE_KEY, []);
  localStorage.setItem(COUNTER_KEY, "0");
}
