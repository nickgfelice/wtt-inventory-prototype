export type Item = {
  id: string;
  name: string;
  category: string;
  location?: string;
  photoDataUrl?: string;
  requiresTracking: boolean;
  checkedOut: boolean;
  checkedOutAt?: number;
  estimatedReturnDate?: string;
  updatedAt: number;
};

type ManageResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

const STORAGE_KEY = "wtt_items_v1";
const COUNTER_KEY = "wtt_item_counter_v1";
const CATEGORY_KEY = "wtt_categories_v1";
const LOCATION_KEY = "wtt_locations_v1";

const DEFAULT_CATEGORIES = [
  "Typewriters",
  "Cameras",
  "Set Pieces",
  "Furniture",
  "Costumes",
  "Props",
];

const DEFAULT_LOCATIONS = ["Aisle 1", "Aisle 2", "Aisle 3"];

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

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeKey(value: string): string {
  return normalizeName(value).toLocaleLowerCase();
}

function uniqueNames(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawValue of values) {
    const value = normalizeName(rawValue);
    if (!value) continue;

    const key = normalizeKey(value);
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(value);
  }

  return result;
}

function normalizeItem(raw: Partial<Item> & Record<string, unknown>): Item {
  const category = normalizeName(String(raw.category ?? "")) || DEFAULT_CATEGORIES[0];
  const location = normalizeName(String(raw.location ?? "")) || undefined;
  const requiresTracking = Boolean(raw.requiresTracking);

  return {
    id: String(raw.id ?? ""),
    name: normalizeName(String(raw.name ?? "")),
    category,
    location,
    photoDataUrl:
      typeof raw.photoDataUrl === "string" && raw.photoDataUrl.trim()
        ? raw.photoDataUrl
        : undefined,
    requiresTracking,
    checkedOut: requiresTracking ? Boolean(raw.checkedOut) : false,
    checkedOutAt:
      typeof raw.checkedOutAt === "number" ? raw.checkedOutAt : undefined,
    estimatedReturnDate:
      typeof raw.estimatedReturnDate === "string" && raw.estimatedReturnDate.trim()
        ? raw.estimatedReturnDate
        : undefined,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
  };
}

function extractNumericIdValue(id: string): number {
  const match = id.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

function getRawItems(): Item[] {
  const rawItems = readJSON<Array<Partial<Item> & Record<string, unknown>>>(STORAGE_KEY, []);
  return rawItems
    .map(normalizeItem)
    .filter((item) => item.id && item.name);
}

function ensureOptionList(
  key: string,
  fallback: string[],
  itemValues: string[],
): string[] {
  const hasStoredValue = localStorage.getItem(key) !== null;
  const base = readJSON<string[]>(key, fallback);
  const merged = uniqueNames([...base, ...itemValues]);

  if (!hasStoredValue || JSON.stringify(base) !== JSON.stringify(merged)) {
    writeJSON(key, merged);
  }

  return merged;
}

function updateOptionValue(
  key: string,
  fallback: string[],
  currentName: string,
  nextName: string,
  itemField: "category" | "location",
): ManageResult {
  const currentValue = normalizeName(currentName);
  const renamedValue = normalizeName(nextName);

  if (!currentValue) {
    return { ok: false, error: "Choose an option to rename." };
  }

  if (!renamedValue) {
    return { ok: false, error: `Enter a ${itemField === "category" ? "category" : "location"} name.` };
  }

  const options = itemField === "category" ? getCategories() : getLocations();
  const currentKey = normalizeKey(currentValue);
  const renamedKey = normalizeKey(renamedValue);

  if (currentKey !== renamedKey && options.some((option) => normalizeKey(option) === renamedKey)) {
    return { ok: false, error: `That ${itemField} already exists.` };
  }

  const updatedOptions = options.map((option) =>
    normalizeKey(option) === currentKey ? renamedValue : option,
  );
  writeJSON(key, uniqueNames(updatedOptions));

  const updatedItems = getRawItems().map((item) =>
    normalizeKey(item[itemField] ?? "") === currentKey
      ? { ...item, [itemField]: renamedValue, updatedAt: Date.now() }
      : item,
  );
  writeJSON(STORAGE_KEY, updatedItems);

  return { ok: true, value: renamedValue };
}

function addOptionValue(
  key: string,
  fallback: string[],
  nextName: string,
  itemField: "category" | "location",
): ManageResult {
  const value = normalizeName(nextName);
  if (!value) {
    return { ok: false, error: `Enter a ${itemField === "category" ? "category" : "location"} name.` };
  }

  const options = ensureOptionList(key, fallback, getRawItems().map((item) => item[itemField] ?? ""));
  if (options.some((option) => normalizeKey(option) === normalizeKey(value))) {
    return { ok: false, error: `That ${itemField} already exists.` };
  }

  writeJSON(key, [...options, value]);
  return { ok: true, value };
}

function deleteOptionValue(
  key: string,
  fallback: string[],
  targetName: string,
  itemField: "category" | "location",
): ManageResult {
  const value = normalizeName(targetName);
  if (!value) {
    return { ok: false, error: `Choose a ${itemField === "category" ? "category" : "location"} to delete.` };
  }

  const valueKey = normalizeKey(value);
  const items = getRawItems();
  const inUseCount = items.filter((item) => normalizeKey(item[itemField] ?? "") === valueKey).length;

  if (inUseCount > 0) {
    return {
      ok: false,
      error: `This ${itemField} is in use by ${inUseCount} item${inUseCount === 1 ? "" : "s"} and cannot be deleted yet.`,
    };
  }

  const options = ensureOptionList(key, fallback, items.map((item) => item[itemField] ?? ""));
  writeJSON(
    key,
    options.filter((option) => normalizeKey(option) !== valueKey),
  );

  return { ok: true, value };
}

export function seedIfEmpty() {
  const items = getRawItems();
  if (items.length === 0) {
    const now = Date.now();
    const seeded: Item[] = [
      {
        id: "WTT-000001",
        name: "Vintage Typewriter",
        category: "Typewriters",
        location: "Aisle 1",
        requiresTracking: false,
        checkedOut: false,
        updatedAt: now,
      },
      {
        id: "WTT-000002",
        name: "Old Film Camera",
        category: "Cameras",
        location: "Aisle 2",
        requiresTracking: false,
        checkedOut: true,
        updatedAt: now,
      },
      {
        id: "WTT-000003",
        name: "Brass Candelabra",
        category: "Set Pieces",
        location: "Aisle 3",
        requiresTracking: false,
        checkedOut: false,
        updatedAt: now,
      },
    ];

    writeJSON(STORAGE_KEY, seeded);
    localStorage.setItem(COUNTER_KEY, "3");
  }

  ensureOptionList(CATEGORY_KEY, DEFAULT_CATEGORIES, getRawItems().map((item) => item.category));
  ensureOptionList(LOCATION_KEY, DEFAULT_LOCATIONS, getRawItems().map((item) => item.location ?? ""));
}

export function getItems(): Item[] {
  const items = getRawItems();
  ensureOptionList(CATEGORY_KEY, DEFAULT_CATEGORIES, items.map((item) => item.category));
  ensureOptionList(LOCATION_KEY, DEFAULT_LOCATIONS, items.map((item) => item.location ?? ""));
  return items;
}

export function getItemById(id: string): Item | undefined {
  return getItems().find((item) => item.id === id);
}

export function getCategories(): string[] {
  return ensureOptionList(CATEGORY_KEY, DEFAULT_CATEGORIES, getRawItems().map((item) => item.category));
}

export function getLocations(): string[] {
  return ensureOptionList(LOCATION_KEY, DEFAULT_LOCATIONS, getRawItems().map((item) => item.location ?? ""));
}

export function addCategory(name: string): ManageResult {
  return addOptionValue(CATEGORY_KEY, DEFAULT_CATEGORIES, name, "category");
}

export function renameCategory(currentName: string, nextName: string): ManageResult {
  return updateOptionValue(CATEGORY_KEY, DEFAULT_CATEGORIES, currentName, nextName, "category");
}

export function deleteCategory(name: string): ManageResult {
  return deleteOptionValue(CATEGORY_KEY, DEFAULT_CATEGORIES, name, "category");
}

export function addLocation(name: string): ManageResult {
  return addOptionValue(LOCATION_KEY, DEFAULT_LOCATIONS, name, "location");
}

export function renameLocation(currentName: string, nextName: string): ManageResult {
  return updateOptionValue(LOCATION_KEY, DEFAULT_LOCATIONS, currentName, nextName, "location");
}

export function deleteLocation(name: string): ManageResult {
  return deleteOptionValue(LOCATION_KEY, DEFAULT_LOCATIONS, name, "location");
}

export function nextItemId(): string {
  const currentCounter = parseInt(localStorage.getItem(COUNTER_KEY) ?? "0", 10) || 0;
  const maxExistingId = getItems().reduce((max, item) => {
    return Math.max(max, extractNumericIdValue(item.id));
  }, 0);
  const next = Math.max(currentCounter, maxExistingId) + 1;
  localStorage.setItem(COUNTER_KEY, String(next));
  return String(next);
}

export function upsertItem(item: Item) {
  const items = getItems();
  const idx = items.findIndex((existingItem) => existingItem.id === item.id);
  const normalizedItem = normalizeItem({
    ...item,
    checkedOut: item.requiresTracking ? item.checkedOut : false,
    updatedAt: Date.now(),
  });

  if (idx >= 0) {
    items[idx] = normalizedItem;
  } else {
    items.unshift(normalizedItem);
  }

  writeJSON(STORAGE_KEY, items);
  ensureOptionList(CATEGORY_KEY, DEFAULT_CATEGORIES, items.map((existingItem) => existingItem.category));
  ensureOptionList(LOCATION_KEY, DEFAULT_LOCATIONS, items.map((existingItem) => existingItem.location ?? ""));
}

export function setCheckedOut(id: string, checkedOut: boolean) {
  const items = getItems();
  const idx = items.findIndex((item) => item.id === id);
  if (idx < 0 || !items[idx].requiresTracking) return;

  items[idx] = { ...items[idx], checkedOut, updatedAt: Date.now() };
  writeJSON(STORAGE_KEY, items);
}

export function setCheckedOutStatus(
  id: string,
  checkedOut: boolean,
  metadata?: { checkedOutAt?: number; estimatedReturnDate?: string },
) {
  const items = getItems();
  const idx = items.findIndex((item) => item.id === id);
  if (idx < 0 || !items[idx].requiresTracking) return;

  const item = items[idx];
  items[idx] = {
    ...item,
    checkedOut,
    checkedOutAt:
      checkedOut
        ? metadata?.checkedOutAt ?? Date.now()
        : item.checkedOutAt,
    estimatedReturnDate:
      checkedOut
        ? metadata?.estimatedReturnDate ?? item.estimatedReturnDate
        : item.estimatedReturnDate,
    updatedAt: Date.now(),
  };
  writeJSON(STORAGE_KEY, items);
}

export function setItems(items: Item[]) {
  const normalizedItems = items.map(normalizeItem);
  writeJSON(STORAGE_KEY, normalizedItems);

  const maxId = normalizedItems.reduce((max, item) => {
    return Math.max(max, extractNumericIdValue(item.id));
  }, 0);

  localStorage.setItem(COUNTER_KEY, String(maxId));
  ensureOptionList(CATEGORY_KEY, DEFAULT_CATEGORIES, normalizedItems.map((item) => item.category));
  ensureOptionList(LOCATION_KEY, DEFAULT_LOCATIONS, normalizedItems.map((item) => item.location ?? ""));
}

export function clearItems() {
  writeJSON(STORAGE_KEY, []);
  localStorage.setItem(COUNTER_KEY, "0");
  ensureOptionList(CATEGORY_KEY, DEFAULT_CATEGORIES, []);
  ensureOptionList(LOCATION_KEY, DEFAULT_LOCATIONS, []);
}

export function deleteItem(id: string) {
  const items = getItems().filter((item) => item.id !== id);
  writeJSON(STORAGE_KEY, items);
  ensureOptionList(CATEGORY_KEY, DEFAULT_CATEGORIES, items.map((item) => item.category));
  ensureOptionList(LOCATION_KEY, DEFAULT_LOCATIONS, items.map((item) => item.location ?? ""));
}
