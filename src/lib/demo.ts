import type { Item, ManageActionResult } from "./types";

// ---------------------------------------------------------------------------
// Default option lists
// ---------------------------------------------------------------------------

const DEFAULT_CATEGORIES = [
  "Typewriters",
  "Cameras",
  "Set Pieces",
  "Furniture",
  "Costumes",
  "Props",
];

const DEFAULT_LOCATIONS = ["Aisle 1", "Aisle 2", "Aisle 3"];

// ---------------------------------------------------------------------------
// Demo seed data
// ---------------------------------------------------------------------------

export function getDemoItems(): Item[] {
  const now = Date.now();
  return [
    {
      id: "WTT-000101",
      name: "Royal Quiet De Luxe",
      category: "Typewriters",
      location: "Aisle 1 / Shelf A",
      photoUrl: "",
      requiresTracking: false,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 60 * 2,
    },
    {
      id: "WTT-000102",
      name: "Underwood No. 5",
      category: "Typewriters",
      location: "Aisle 1 / Shelf B",
      photoUrl: "",
      requiresTracking: false,
      checkedOut: true,
      updatedAt: now - 1000 * 60 * 60 * 24,
    },
    {
      id: "WTT-000103",
      name: "Olympia SM9",
      category: "Typewriters",
      location: "Aisle 1 / Shelf C",
      photoUrl: "",
      requiresTracking: true,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 15,
    },
    {
      id: "WTT-000104",
      name: "Canon AE-1",
      category: "Cameras",
      location: "Aisle 2 / Shelf A",
      photoUrl: "",
      requiresTracking: false,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 60 * 6,
    },
    {
      id: "WTT-000105",
      name: "Nikon FM2",
      category: "Cameras",
      location: "Aisle 2 / Shelf B",
      photoUrl: "",
      requiresTracking: false,
      checkedOut: true,
      updatedAt: now - 1000 * 60 * 60 * 48,
    },
    {
      id: "WTT-000106",
      name: "Polaroid SX-70",
      category: "Cameras",
      location: "Aisle 2 / Shelf C",
      photoUrl: "",
      requiresTracking: false,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 60 * 10,
    },
    {
      id: "WTT-000107",
      name: "Victorian Writing Desk",
      category: "Furniture",
      location: "Bay 3",
      photoUrl: "",
      requiresTracking: false,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 90,
    },
    {
      id: "WTT-000108",
      name: "Oak Rolltop Desk",
      category: "Furniture",
      location: "Bay 3",
      photoUrl: "",
      requiresTracking: true,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 60 * 72,
    },
    {
      id: "WTT-000109",
      name: "Art Deco Sideboard",
      category: "Furniture",
      location: "Bay 4",
      photoUrl: "",
      requiresTracking: false,
      checkedOut: true,
      updatedAt: now - 1000 * 60 * 60 * 30,
    },
    {
      id: "WTT-000110",
      name: "Gaslight Street Lamp",
      category: "Set Pieces",
      location: "Back Lot",
      photoUrl: "",
      requiresTracking: false,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 60 * 5,
    },
    {
      id: "WTT-000111",
      name: "Library Book Wall",
      category: "Set Pieces",
      location: "Stage B",
      photoUrl: "",
      requiresTracking: true,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 60 * 12,
    },
    {
      id: "WTT-000112",
      name: "Paris Cafe Table",
      category: "Set Pieces",
      location: "Stage C",
      photoUrl: "",
      requiresTracking: false,
      checkedOut: true,
      updatedAt: now - 1000 * 60 * 60 * 18,
    },
    {
      id: "WTT-000113",
      name: "1940s Trench Coat",
      category: "Costumes",
      location: "Wardrobe 1",
      photoUrl: "",
      requiresTracking: false,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 35,
    },
    {
      id: "WTT-000114",
      name: "Victorian Gown",
      category: "Costumes",
      location: "Wardrobe 2",
      photoUrl: "",
      requiresTracking: false,
      checkedOut: true,
      updatedAt: now - 1000 * 60 * 60 * 20,
    },
    {
      id: "WTT-000115",
      name: "Pirate Captain Coat",
      category: "Costumes",
      location: "Wardrobe 3",
      photoUrl: "",
      requiresTracking: false,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 60 * 8,
    },
    {
      id: "WTT-000116",
      name: "Brass Telescope",
      category: "Props",
      location: "Props Cage A",
      photoUrl: "",
      requiresTracking: false,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 60 * 3,
    },
    {
      id: "WTT-000117",
      name: "Antique Compass",
      category: "Props",
      location: "Props Cage B",
      photoUrl: "",
      requiresTracking: false,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 60 * 14,
    },
    {
      id: "WTT-000118",
      name: "Leather Satchel",
      category: "Props",
      location: "Props Cage C",
      photoUrl: "",
      requiresTracking: false,
      checkedOut: true,
      updatedAt: now - 1000 * 60 * 60 * 40,
    },
  ];
}

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

let items: Item[] = [];
let categories: string[] = [];
let locations: string[] = [];
let idCounter = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const v of values) {
    const key = v.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(v.trim());
  }
  return result;
}

function extractNumericId(id: string): number {
  const match = id.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

function padId(n: number): string {
  return `WTT-${String(n).padStart(6, "0")}`;
}

function nextId(): string {
  const maxExisting = items.reduce(
    (max, item) => Math.max(max, extractNumericId(item.id)),
    0,
  );
  idCounter = Math.max(idCounter, maxExisting) + 1;
  return padId(idCounter);
}

// ---------------------------------------------------------------------------
// Data Client interface — all async, zero API calls
// ---------------------------------------------------------------------------

export async function initialize(): Promise<void> {
  items = getDemoItems();
  categories = uniqueStrings([
    ...DEFAULT_CATEGORIES,
    ...items.map((i) => i.category),
  ]);
  locations = uniqueStrings([
    ...DEFAULT_LOCATIONS,
    ...items.map((i) => i.location ?? "").filter(Boolean),
  ]);
  idCounter = items.reduce(
    (max, item) => Math.max(max, extractNumericId(item.id)),
    0,
  );
}

// -- Items ------------------------------------------------------------------

export async function getItems(): Promise<Item[]> {
  return [...items];
}

export async function getItemById(id: string): Promise<Item | undefined> {
  return items.find((item) => item.id === id);
}

export async function upsertItem(
  item: Omit<Item, "id"> & { id?: string },
): Promise<Item> {
  const id = item.id || nextId();
  const now = Date.now();
  const full: Item = {
    ...item,
    id,
    photoUrl: item.photoUrl ?? "",
    checkedOut: item.requiresTracking ? item.checkedOut : false,
    updatedAt: now,
  };

  const idx = items.findIndex((i) => i.id === id);
  if (idx >= 0) {
    items[idx] = full;
  } else {
    items.unshift(full);
  }

  // Ensure category / location lists stay in sync
  if (full.category && !categories.some((c) => c.toLowerCase() === full.category.toLowerCase())) {
    categories.push(full.category);
  }
  if (full.location && !locations.some((l) => l.toLowerCase() === full.location!.toLowerCase())) {
    locations.push(full.location);
  }

  return full;
}

export async function deleteItem(id: string): Promise<void> {
  items = items.filter((item) => item.id !== id);
}

// -- Checked-out status -----------------------------------------------------

export async function setCheckedOut(
  id: string,
  checkedOut: boolean,
): Promise<void> {
  const item = items.find((i) => i.id === id);
  if (!item || !item.requiresTracking) return;
  item.checkedOut = checkedOut;
  item.updatedAt = Date.now();
}

export async function setCheckedOutStatus(
  id: string,
  checkedOut: boolean,
  metadata?: { checkedOutAt?: number; estimatedReturnDate?: string; organizationName?: string },
): Promise<void> {
  const item = items.find((i) => i.id === id);
  if (!item || !item.requiresTracking) return;

  item.checkedOut = checkedOut;
  if (checkedOut) {
    item.checkedOutAt = metadata?.checkedOutAt ?? Date.now();
    item.estimatedReturnDate =
      metadata?.estimatedReturnDate ?? item.estimatedReturnDate;
    item.organizationName = metadata?.organizationName ?? item.organizationName;
  }
  item.updatedAt = Date.now();
}

// -- Categories -------------------------------------------------------------

export async function getCategories(): Promise<string[]> {
  return [...categories];
}

export async function addCategory(name: string): Promise<ManageActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Enter a category name." };
  if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, error: "That category already exists." };
  }
  categories.push(trimmed);
  return { ok: true, value: trimmed };
}

export async function renameCategory(
  currentName: string,
  newName: string,
): Promise<ManageActionResult> {
  const current = currentName.trim();
  const next = newName.trim();
  if (!current) return { ok: false, error: "Choose an option to rename." };
  if (!next) return { ok: false, error: "Enter a category name." };

  const currentKey = current.toLowerCase();
  const nextKey = next.toLowerCase();

  if (currentKey !== nextKey && categories.some((c) => c.toLowerCase() === nextKey)) {
    return { ok: false, error: "That category already exists." };
  }

  categories = categories.map((c) =>
    c.toLowerCase() === currentKey ? next : c,
  );

  for (const item of items) {
    if (item.category.toLowerCase() === currentKey) {
      item.category = next;
      item.updatedAt = Date.now();
    }
  }

  return { ok: true, value: next };
}

export async function deleteCategory(
  name: string,
): Promise<ManageActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Choose a category to delete." };

  const key = trimmed.toLowerCase();
  const inUse = items.filter((i) => i.category.toLowerCase() === key).length;
  if (inUse > 0) {
    return {
      ok: false,
      error: `This category is in use by ${inUse} item${inUse === 1 ? "" : "s"} and cannot be deleted yet.`,
    };
  }

  categories = categories.filter((c) => c.toLowerCase() !== key);
  return { ok: true, value: trimmed };
}

// -- Locations --------------------------------------------------------------

export async function getLocations(): Promise<string[]> {
  return [...locations];
}

export async function addLocation(name: string): Promise<ManageActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Enter a location name." };
  if (locations.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, error: "That location already exists." };
  }
  locations.push(trimmed);
  return { ok: true, value: trimmed };
}

export async function renameLocation(
  currentName: string,
  newName: string,
): Promise<ManageActionResult> {
  const current = currentName.trim();
  const next = newName.trim();
  if (!current) return { ok: false, error: "Choose an option to rename." };
  if (!next) return { ok: false, error: "Enter a location name." };

  const currentKey = current.toLowerCase();
  const nextKey = next.toLowerCase();

  if (currentKey !== nextKey && locations.some((l) => l.toLowerCase() === nextKey)) {
    return { ok: false, error: "That location already exists." };
  }

  locations = locations.map((l) =>
    l.toLowerCase() === currentKey ? next : l,
  );

  for (const item of items) {
    if (item.location && item.location.toLowerCase() === currentKey) {
      item.location = next;
      item.updatedAt = Date.now();
    }
  }

  return { ok: true, value: next };
}

export async function deleteLocation(
  name: string,
): Promise<ManageActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Choose a location to delete." };

  const key = trimmed.toLowerCase();
  const inUse = items.filter(
    (i) => i.location && i.location.toLowerCase() === key,
  ).length;
  if (inUse > 0) {
    return {
      ok: false,
      error: `This location is in use by ${inUse} item${inUse === 1 ? "" : "s"} and cannot be deleted yet.`,
    };
  }

  locations = locations.filter((l) => l.toLowerCase() !== key);
  return { ok: true, value: trimmed };
}

// -- Photos (fake in demo mode) ---------------------------------------------

export async function uploadPhoto(
  dataUrl: string,
): Promise<{ fileId: string; url: string }> {
  const fakeFileId = `demo-photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return { fileId: fakeFileId, url: dataUrl };
}

export async function deletePhoto(_fileId: string): Promise<void> {
  // No-op in demo mode — nothing to clean up
}

// -- Bulk operations --------------------------------------------------------

export async function clearItems(): Promise<void> {
  items = [];
  idCounter = 0;
}

export async function setItems(newItems: Item[]): Promise<void> {
  items = newItems.map((item) => ({ ...item }));
  idCounter = items.reduce(
    (max, item) => Math.max(max, extractNumericId(item.id)),
    0,
  );
  categories = uniqueStrings([
    ...DEFAULT_CATEGORIES,
    ...items.map((i) => i.category),
  ]);
  locations = uniqueStrings([
    ...DEFAULT_LOCATIONS,
    ...items.map((i) => i.location ?? "").filter(Boolean),
  ]);
}
