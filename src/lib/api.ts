/**
 * Data Client — async API wrapper with in-memory cache.
 *
 * Replaces the localStorage-based storage.ts with HTTP calls to the
 * Python API endpoints. Mirrors the same interface as demo.ts.
 */

import type { Item, ManageActionResult } from "./types";

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let cachedItems: Item[] | null = null;
let cachedCategories: string[] | null = null;
let cachedLocations: string[] | null = null;

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function translateStatus(status: number): string {
  switch (status) {
    case 400:
      return "Bad request";
    case 404:
      return "Item not found";
    case 500:
      return "Server configuration error. Contact support.";
    case 502:
      return "Unable to reach Google Sheets. Try again.";
    default:
      return `Unexpected error (${status})`;
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      body.error || translateStatus(response.status),
      response.status,
    );
  }
  return response.json();
}

function manageResult(fn: () => Promise<unknown>): Promise<ManageActionResult> {
  return fn()
    .then((res) => {
      const r = res as Record<string, unknown>;
      return { ok: true as const, value: String(r.name ?? "") };
    })
    .catch((err) => {
      if (err instanceof ApiError) {
        return { ok: false as const, error: err.message };
      }
      return { ok: false as const, error: "Network error. Check your connection." };
    });
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

export async function initialize(): Promise<void> {
  try {
    const [items, categories, locations] = await Promise.all([
      apiFetch<Item[]>("/api/items"),
      apiFetch<string[]>("/api/categories"),
      apiFetch<string[]>("/api/locations"),
    ]);
    cachedItems = items;
    cachedCategories = categories;
    cachedLocations = locations;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Network error. Check your connection.", 0);
  }
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export async function getItems(): Promise<Item[]> {
  if (cachedItems === null) {
    cachedItems = await apiFetch<Item[]>("/api/items");
  }
  return [...cachedItems];
}

export async function getItemById(id: string): Promise<Item | undefined> {
  const items = await getItems();
  return items.find((item) => item.id === id);
}

export async function upsertItem(
  item: Omit<Item, "id"> & { id?: string },
): Promise<Item> {
  try {
    let saved: Item;
    if (item.id) {
      saved = await apiFetch<Item>("/api/items", {
        method: "PUT",
        body: JSON.stringify(item),
      });
    } else {
      saved = await apiFetch<Item>("/api/items", {
        method: "POST",
        body: JSON.stringify(item),
      });
    }

    // Update cache
    if (cachedItems !== null) {
      const idx = cachedItems.findIndex((i) => i.id === saved.id);
      if (idx >= 0) {
        cachedItems[idx] = saved;
      } else {
        cachedItems.unshift(saved);
      }
    }

    return saved;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Network error. Check your connection.", 0);
  }
}

export async function deleteItem(id: string): Promise<void> {
  try {
    await apiFetch<{ ok: boolean }>("/api/items", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });

    // Update cache
    if (cachedItems !== null) {
      cachedItems = cachedItems.filter((item) => item.id !== id);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Network error. Check your connection.", 0);
  }
}

// ---------------------------------------------------------------------------
// Checked-out status
// ---------------------------------------------------------------------------

export async function setCheckedOut(
  id: string,
  checkedOut: boolean,
): Promise<void> {
  try {
    const updated = await apiFetch<Item>("/api/items", {
      method: "PUT",
      body: JSON.stringify({ id, checkedOut }),
    });

    // Update cache
    if (cachedItems !== null) {
      const idx = cachedItems.findIndex((i) => i.id === id);
      if (idx >= 0) {
        cachedItems[idx] = updated;
      }
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Network error. Check your connection.", 0);
  }
}

export async function setCheckedOutStatus(
  id: string,
  checkedOut: boolean,
  metadata?: { checkedOutAt?: number; estimatedReturnDate?: string; organizationName?: string },
): Promise<void> {
  try {
    const payload: Record<string, unknown> = { id, checkedOut };
    if (metadata?.checkedOutAt !== undefined) {
      payload.checkedOutAt = metadata.checkedOutAt;
    }
    if (metadata?.estimatedReturnDate !== undefined) {
      payload.estimatedReturnDate = metadata.estimatedReturnDate;
    }
    if (metadata?.organizationName !== undefined) {
      payload.organizationName = metadata.organizationName;
    }

    const updated = await apiFetch<Item>("/api/items", {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    // Update cache
    if (cachedItems !== null) {
      const idx = cachedItems.findIndex((i) => i.id === id);
      if (idx >= 0) {
        cachedItems[idx] = updated;
      }
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Network error. Check your connection.", 0);
  }
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function getCategories(): Promise<string[]> {
  if (cachedCategories === null) {
    cachedCategories = await apiFetch<string[]>("/api/categories");
  }
  return [...cachedCategories];
}

export async function addCategory(name: string): Promise<ManageActionResult> {
  return manageResult(async () => {
    const result = await apiFetch<{ name: string }>("/api/categories", {
      method: "POST",
      body: JSON.stringify({ name }),
    });

    // Update cache
    if (cachedCategories !== null) {
      cachedCategories.push(result.name);
    }

    return result;
  });
}

export async function renameCategory(
  currentName: string,
  newName: string,
): Promise<ManageActionResult> {
  return manageResult(async () => {
    const result = await apiFetch<{ name: string }>("/api/categories", {
      method: "PUT",
      body: JSON.stringify({ currentName, newName }),
    });

    // Update cache
    if (cachedCategories !== null) {
      cachedCategories = cachedCategories.map((c) =>
        c.toLowerCase() === currentName.trim().toLowerCase() ? result.name : c,
      );
    }
    // Also update cached items that reference the old category
    if (cachedItems !== null) {
      for (const item of cachedItems) {
        if (item.category.toLowerCase() === currentName.trim().toLowerCase()) {
          item.category = result.name;
        }
      }
    }

    return result;
  });
}

export async function deleteCategory(
  name: string,
): Promise<ManageActionResult> {
  return manageResult(async () => {
    const result = await apiFetch<{ ok: boolean }>("/api/categories", {
      method: "DELETE",
      body: JSON.stringify({ name }),
    });

    // Update cache
    if (cachedCategories !== null) {
      cachedCategories = cachedCategories.filter(
        (c) => c.toLowerCase() !== name.trim().toLowerCase(),
      );
    }

    return { ...result, name };
  });
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export async function getLocations(): Promise<string[]> {
  if (cachedLocations === null) {
    cachedLocations = await apiFetch<string[]>("/api/locations");
  }
  return [...cachedLocations];
}

export async function addLocation(name: string): Promise<ManageActionResult> {
  return manageResult(async () => {
    const result = await apiFetch<{ name: string }>("/api/locations", {
      method: "POST",
      body: JSON.stringify({ name }),
    });

    // Update cache
    if (cachedLocations !== null) {
      cachedLocations.push(result.name);
    }

    return result;
  });
}

export async function renameLocation(
  currentName: string,
  newName: string,
): Promise<ManageActionResult> {
  return manageResult(async () => {
    const result = await apiFetch<{ name: string }>("/api/locations", {
      method: "PUT",
      body: JSON.stringify({ currentName, newName }),
    });

    // Update cache
    if (cachedLocations !== null) {
      cachedLocations = cachedLocations.map((l) =>
        l.toLowerCase() === currentName.trim().toLowerCase() ? result.name : l,
      );
    }
    // Also update cached items that reference the old location
    if (cachedItems !== null) {
      for (const item of cachedItems) {
        if (
          item.location &&
          item.location.toLowerCase() === currentName.trim().toLowerCase()
        ) {
          item.location = result.name;
        }
      }
    }

    return result;
  });
}

export async function deleteLocation(
  name: string,
): Promise<ManageActionResult> {
  return manageResult(async () => {
    const result = await apiFetch<{ ok: boolean }>("/api/locations", {
      method: "DELETE",
      body: JSON.stringify({ name }),
    });

    // Update cache
    if (cachedLocations !== null) {
      cachedLocations = cachedLocations.filter(
        (l) => l.toLowerCase() !== name.trim().toLowerCase(),
      );
    }

    return { ...result, name };
  });
}

// ---------------------------------------------------------------------------
// Photos — stored as base64 in the Sheet, no separate upload needed
// ---------------------------------------------------------------------------

export async function uploadPhoto(
  dataUrl: string,
): Promise<{ url: string }> {
  // Photos are stored directly in the item's photoUrl field.
  // This function just passes through the data URL.
  return { url: dataUrl };
}

export async function deletePhoto(_fileId: string): Promise<void> {
  // No-op — photos are stored inline in the Sheet, deleted with the item.
}

// ---------------------------------------------------------------------------
// Bulk operations (demo-only stubs)
// ---------------------------------------------------------------------------

export async function clearItems(): Promise<void> {
  throw new Error("clearItems is not supported in production mode.");
}

export async function setItems(_items: Item[]): Promise<void> {
  throw new Error("setItems is not supported in production mode.");
}
