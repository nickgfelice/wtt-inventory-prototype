export type Item = {
  id: string;
  name: string;
  category: string;
  location?: string;
  condition: string;
  checkedOut: boolean;
  checkedOutTo?: string;
  dueBack?: string;
  notes?: string;
  imageDataUrl?: string;
  updatedAt: number;
};

const STORAGE_KEY = "wtt-items";

export function getItems(): Item[] {
  if (typeof localStorage === "undefined") return [];

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as Item[];
  } catch {
    return [];
  }
}

export function setItems(items: Item[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function clearItems(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function upsertItem(item: Item): void {
  const items = getItems();
  const idx = items.findIndex((x) => x.id === item.id);

  const nextItem = {
    ...item,
    updatedAt: Date.now(),
  };

  if (idx >= 0) {
    items[idx] = nextItem;
  } else {
    items.push(nextItem);
  }

  setItems(items);
}

export function setCheckedOut(
  id: string,
  checkedOut: boolean,
  checkedOutTo?: string,
  dueBack?: string
): void {
  const items = getItems().map((item) =>
    item.id === id
      ? {
          ...item,
          checkedOut,
          checkedOutTo: checkedOut ? checkedOutTo : undefined,
          dueBack: checkedOut ? dueBack : undefined,
          updatedAt: Date.now(),
        }
      : item
  );

  setItems(items);
}

export function nextItemId(): string {
  const items = getItems();

  const maxNumericId = items.reduce((max, item) => {
    const match = item.id.match(/WTT-(\d+)/);
    const num = match ? Number(match[1]) : 0;
    return Math.max(max, num);
  }, 100000);

  return `WTT-${String(maxNumericId + 1).padStart(6, "0")}`;
}

export function seedIfEmpty(seedItems: Item[] = []): void {
  const existing = getItems();
  if (existing.length === 0 && seedItems.length > 0) {
    setItems(seedItems);
  }
}
