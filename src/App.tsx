import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  addCategory,
  addLocation,
  clearItems,
  deleteItem,
  deleteCategory,
  deleteLocation,
  getCategories,
  getItems,
  getLocations,
  nextItemId,
  renameCategory,
  renameLocation,
  setCheckedOut,
  setCheckedOutStatus,
  setItems,
  type Item,
  upsertItem,
} from "./lib/storage";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

type OptionManagerKind = "category" | "location";

type ManageActionResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

const getDemoItems = (): Item[] => {
  const now = Date.now();
  return [
    {
      id: "WTT-000101",
      name: "Royal Quiet De Luxe",
      category: "Typewriters",
      location: "Aisle 1 / Shelf A",
      requiresTracking: false,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 60 * 2,
    },
    {
      id: "WTT-000102",
      name: "Underwood No. 5",
      category: "Typewriters",
      location: "Aisle 1 / Shelf B",
      requiresTracking: false,
      checkedOut: true,
      updatedAt: now - 1000 * 60 * 60 * 24,
    },
    {
      id: "WTT-000103",
      name: "Olympia SM9",
      category: "Typewriters",
      location: "Aisle 1 / Shelf C",
      requiresTracking: true,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 15,
    },
    {
      id: "WTT-000104",
      name: "Canon AE-1",
      category: "Cameras",
      location: "Aisle 2 / Shelf A",
      requiresTracking: false,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 60 * 6,
    },
    {
      id: "WTT-000105",
      name: "Nikon FM2",
      category: "Cameras",
      location: "Aisle 2 / Shelf B",
      requiresTracking: false,
      checkedOut: true,
      updatedAt: now - 1000 * 60 * 60 * 48,
    },
    {
      id: "WTT-000106",
      name: "Polaroid SX-70",
      category: "Cameras",
      location: "Aisle 2 / Shelf C",
      requiresTracking: false,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 60 * 10,
    },
    {
      id: "WTT-000107",
      name: "Victorian Writing Desk",
      category: "Furniture",
      location: "Bay 3",
      requiresTracking: false,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 90,
    },
    {
      id: "WTT-000108",
      name: "Oak Rolltop Desk",
      category: "Furniture",
      location: "Bay 3",
      requiresTracking: true,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 60 * 72,
    },
    {
      id: "WTT-000109",
      name: "Art Deco Sideboard",
      category: "Furniture",
      location: "Bay 4",
      requiresTracking: false,
      checkedOut: true,
      updatedAt: now - 1000 * 60 * 60 * 30,
    },
    {
      id: "WTT-000110",
      name: "Gaslight Street Lamp",
      category: "Set Pieces",
      location: "Back Lot",
      requiresTracking: false,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 60 * 5,
    },
    {
      id: "WTT-000111",
      name: "Library Book Wall",
      category: "Set Pieces",
      location: "Stage B",
      requiresTracking: true,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 60 * 12,
    },
    {
      id: "WTT-000112",
      name: "Paris Cafe Table",
      category: "Set Pieces",
      location: "Stage C",
      requiresTracking: false,
      checkedOut: true,
      updatedAt: now - 1000 * 60 * 60 * 18,
    },
    {
      id: "WTT-000113",
      name: "1940s Trench Coat",
      category: "Costumes",
      location: "Wardrobe 1",
      requiresTracking: false,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 35,
    },
    {
      id: "WTT-000114",
      name: "Victorian Gown",
      category: "Costumes",
      location: "Wardrobe 2",
      requiresTracking: false,
      checkedOut: true,
      updatedAt: now - 1000 * 60 * 60 * 20,
    },
    {
      id: "WTT-000115",
      name: "Pirate Captain Coat",
      category: "Costumes",
      location: "Wardrobe 3",
      requiresTracking: false,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 60 * 8,
    },
    {
      id: "WTT-000116",
      name: "Brass Telescope",
      category: "Props",
      location: "Props Cage A",
      requiresTracking: false,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 60 * 3,
    },
    {
      id: "WTT-000117",
      name: "Antique Compass",
      category: "Props",
      location: "Props Cage B",
      requiresTracking: false,
      checkedOut: false,
      updatedAt: now - 1000 * 60 * 60 * 14,
    },
    {
      id: "WTT-000118",
      name: "Leather Satchel",
      category: "Props",
      location: "Props Cage C",
      requiresTracking: false,
      checkedOut: true,
      updatedAt: now - 1000 * 60 * 60 * 40,
    },
  ];
};

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });
}

function formatRelativeTime(timestamp: number): string {
  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / (1000 * 60)));
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

function formatDateLabel(value: string): string {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(parsed);
}

function FieldWithManage(props: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
  onManage: () => void;
  optional?: boolean;
}) {
  const { label, value, options, placeholder, onChange, onManage, optional } = props;

  return (
    <div className="form-section">
      <div className="field-header">
        <label>{label}</label>
        <button type="button" className="text-button" onClick={onManage}>
          Manage
        </button>
      </div>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {optional && <option value="">{placeholder}</option>}
        {!optional && options.length === 0 && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function TrackingField(props: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="form-section">
      <label>Needs to be tracked?</label>
      <div className="radio-group tracking-group">
        <label className="choice-card">
          <input
            type="radio"
            name="tracking"
            checked={props.value}
            onChange={() => props.onChange(true)}
          />
          <span>
            <strong>Yes, this item needs to be tracked</strong>
            <small>Staff can check this item in and out as usual.</small>
          </span>
        </label>
        <label className="choice-card">
          <input
            type="radio"
            name="tracking"
            checked={!props.value}
            onChange={() => props.onChange(false)}
          />
          <span>
            <strong>No, this item does not need to be tracked</strong>
            <small>Check In and Check Out will be unavailable for this item.</small>
          </span>
        </label>
      </div>
    </div>
  );
}

function OptionManagerModal(props: {
  kind: OptionManagerKind;
  options: string[];
  selectedValue: string;
  onSelectValue: (value: string) => void;
  onClose: () => void;
  onOptionsChanged: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [error, setError] = useState("");

  const label = props.kind === "category" ? "category" : "location";
  const title = props.kind === "category" ? "Manage Categories" : "Manage Locations";

  const addOption = (name: string): ManageActionResult =>
    props.kind === "category" ? addCategory(name) : addLocation(name);
  const renameOption = (currentName: string, nextName: string): ManageActionResult =>
    props.kind === "category"
      ? renameCategory(currentName, nextName)
      : renameLocation(currentName, nextName);
  const deleteOption = (name: string): ManageActionResult =>
    props.kind === "category" ? deleteCategory(name) : deleteLocation(name);

  const handleAdd = () => {
    const result = addOption(newName);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError("");
    setNewName("");
    props.onSelectValue(result.value);
    props.onOptionsChanged();
  };

  const handleRename = (currentName: string) => {
    const result = renameOption(currentName, editingValue);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError("");
    setEditingName(null);
    setEditingValue("");
    if (props.selectedValue === currentName) {
      props.onSelectValue(result.value);
    }
    props.onOptionsChanged();
  };

  const handleDelete = (name: string) => {
    if (!window.confirm(`Delete this ${label}?`)) return;

    const result = deleteOption(name);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError("");
    props.onOptionsChanged();
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={props.onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="text-button" onClick={props.onClose}>
            Close
          </button>
        </div>

        <p className="helper-text" style={{ marginTop: 0 }}>
          Add a new {label}, rename an existing one, or remove an unused option.
        </p>

        <div className="form-section">
          <label>Add {label}</label>
          <div className="inline-action-row">
            <input
              type="text"
              value={newName}
              placeholder={`New ${label} name`}
              onChange={(event) => setNewName(event.target.value)}
            />
            <button type="button" className="btn-primary" onClick={handleAdd}>
              Add
            </button>
          </div>
        </div>

        <div className="option-list">
          {props.options.map((option) => {
            const isEditing = editingName === option;

            return (
              <div key={option} className="option-row">
                {!isEditing ? (
                  <>
                    <div>
                      <div style={{ fontWeight: 600 }}>{option}</div>
                      {props.selectedValue === option && (
                        <div className="helper-text">Currently selected</div>
                      )}
                    </div>
                    <div className="option-actions">
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => {
                          setEditingName(option);
                          setEditingValue(option);
                          setError("");
                        }}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => handleDelete(option)}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={editingValue}
                      onChange={(event) => setEditingValue(event.target.value)}
                    />
                    <div className="option-actions">
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleRename(option)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => {
                          setEditingName(null);
                          setEditingValue("");
                          setError("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {error && <div className="ui-section inline-message error-message">{error}</div>}
      </div>
    </div>
  );
}

function InventoryList() {
  const [query, setQuery] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [checkedOutFilter, setCheckedOutFilter] = useState("All");
  const navigate = useNavigate();

  const allItems = useMemo(() => {
    void refresh;
    return getItems();
  }, [refresh]);

  const categories = useMemo(() => {
    void refresh;
    return getCategories();
  }, [refresh]);

  const items = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return allItems.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        item.id.toLowerCase().includes(normalizedQuery) ||
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.category.toLowerCase().includes(normalizedQuery);

      const matchesCategory =
        categoryFilter === "All" || item.category === categoryFilter;

      const matchesCheckedOut =
        checkedOutFilter === "All" ||
        (checkedOutFilter === "Available" && !item.checkedOut) ||
        (checkedOutFilter === "Checked Out" && item.checkedOut);

      return matchesQuery && matchesCategory && matchesCheckedOut;
    });
  }, [allItems, categoryFilter, checkedOutFilter, query]);

  const handleClearFilters = () => {
    setQuery("");
    setCategoryFilter("All");
    setCheckedOutFilter("All");
  };

  const handleLoadDemo = () => {
    setItems(getDemoItems());
    setRefresh((value) => value + 1);
  };

  const handleResetDemo = () => {
    clearItems();
    setRefresh((value) => value + 1);
  };

  return (
    <div className="container">
      <h1>Inventory</h1>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search items by ID, name, or category..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="ui-section" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ minWidth: 200 }}>
          <label>Category</label>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option>All</option>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: 200 }}>
          <label>Checked Out</label>
          <select value={checkedOutFilter} onChange={(event) => setCheckedOutFilter(event.target.value)}>
            <option>All</option>
            <option>Available</option>
            <option>Checked Out</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button className="btn-cancel" onClick={handleClearFilters}>
            Clear
          </button>
        </div>
      </div>

      {DEMO_MODE && (
        <div className="ui-section" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn-primary" onClick={handleLoadDemo}>
            Load demo data
          </button>
          <button className="btn-cancel" onClick={handleResetDemo}>
            Reset demo
          </button>
        </div>
      )}

      {allItems.length === 0 ? (
        <div className="ui-section empty-state">
          <div className="empty-state-title">No inventory items yet. Add your first item to get started.</div>
        </div>
      ) : items.length === 0 ? (
        <div className="ui-section empty-state">
          <div className="empty-state-title">No results match your search or filters.</div>
          <div style={{ marginTop: 12 }}>
            <button className="btn-cancel" onClick={handleClearFilters}>
              Clear filters
            </button>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>Item ID</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Tracking</th>
                <th>Checked Out</th>
                <th>Loan Info</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => navigate(`/item/${encodeURIComponent(item.id)}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    {item.photoDataUrl ? (
                      <img
                        src={item.photoDataUrl}
                        alt={item.name}
                        className="inventory-thumbnail"
                      />
                    ) : (
                      <div className="inventory-thumbnail inventory-thumbnail-placeholder" aria-label="No image">
                        No image
                      </div>
                    )}
                  </td>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>{item.requiresTracking ? "Tracked" : "Standard"}</td>
                  <td>{item.checkedOut ? "Yes" : "No"}</td>
                  <td>
                    {item.checkedOutAt || item.estimatedReturnDate ? (
                      <div style={{ fontSize: 12, lineHeight: 1.4 }}>
                        {item.checkedOutAt && <div>Out: {formatDateTime(item.checkedOutAt)}</div>}
                        {item.estimatedReturnDate && (
                          <div>Est. return: {formatDateLabel(item.estimatedReturnDate)}</div>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AddItem() {
  const navigate = useNavigate();
  const [optionsVersion, setOptionsVersion] = useState(0);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [itemLocation, setItemLocation] = useState("");
  const [requiresTracking, setRequiresTracking] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);
  const [managerKind, setManagerKind] = useState<OptionManagerKind | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const categories = useMemo(() => {
    void optionsVersion;
    return getCategories();
  }, [optionsVersion]);

  const locations = useMemo(() => {
    void optionsVersion;
    return getLocations();
  }, [optionsVersion]);

  useEffect(() => {
    if (!category && categories.length > 0) {
      setCategory(categories[0]);
    } else if (category && !categories.includes(category)) {
      setCategory(categories[0] ?? "");
    }
  }, [categories, category]);

  useEffect(() => {
    if (itemLocation && !locations.includes(itemLocation)) {
      setItemLocation("");
    }
  }, [itemLocation, locations]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const handlePhotoSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setIsLoadingPhoto(true);

    try {
      const dataUrl = await readImageAsDataUrl(file);
      setPhotoDataUrl(dataUrl);
    } catch (selectionError: any) {
      setError(selectionError?.message ?? "Unable to load that image.");
    } finally {
      setIsLoadingPhoto(false);
    }
  };

  const handleSave = () => {
    setError("");

    const trimmedName = name.trim();
    if (!photoDataUrl) {
      setError("Add a photo before saving this item.");
      return;
    }

    if (!trimmedName) {
      setError("Item name is required.");
      return;
    }

    if (!category) {
      setError("Choose a category before saving.");
      return;
    }

    setIsSaving(true);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      const id = nextItemId();

      upsertItem({
        id,
        name: trimmedName,
        category,
        location: itemLocation || undefined,
        photoDataUrl,
        requiresTracking,
        checkedOut: false,
        updatedAt: Date.now(),
      });

      setIsSaving(false);
      navigate(`/item/${encodeURIComponent(id)}`, { state: { saved: true } });
    }, 300);
  };

  return (
    <div className="container">
      <h1>Add Item</h1>

      <div className="ui-section">
        <div className="section-title-row">
          <div>
            <h2 style={{ marginBottom: 4 }}>Step 1: Add Photo</h2>
            <p className="helper-text" style={{ marginTop: 0 }}>
              Start with a photo, then finish the intake details below.
            </p>
          </div>
          {photoDataUrl && <span className="step-badge complete">Complete</span>}
        </div>

        <div className="photo-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isLoadingPhoto}
          >
            {isLoadingPhoto ? "Loading photo..." : "Take Photo"}
          </button>
          <button
            type="button"
            className="btn-cancel"
            onClick={() => uploadInputRef.current?.click()}
            disabled={isLoadingPhoto}
          >
            Upload Photo
          </button>
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handlePhotoSelection}
        />
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handlePhotoSelection}
        />

        {photoDataUrl ? (
          <div className="photo-preview-card">
            <img src={photoDataUrl} alt="Item preview" className="photo-preview" />
            <button type="button" className="text-button" onClick={() => setPhotoDataUrl("")}>
              Remove photo
            </button>
          </div>
        ) : (
          <div className="photo-placeholder">
            <strong>Photo required</strong>
            <span>Take a photo or upload one to continue with intake.</span>
          </div>
        )}
      </div>

      <div className={`ui-section ${!photoDataUrl ? "details-disabled" : ""}`}>
        <div className="section-title-row">
          <div>
            <h2 style={{ marginBottom: 4 }}>Step 2: Intake Details</h2>
            <p className="helper-text" style={{ marginTop: 0 }}>
              Enter the item details after a photo has been added.
            </p>
          </div>
          <span className={`step-badge ${photoDataUrl ? "ready" : ""}`}>
            {photoDataUrl ? "Ready" : "Locked"}
          </span>
        </div>

        {!photoDataUrl && (
          <div className="ui-section inline-message">
            Take Photo is the primary step. The rest of the form will unlock after you add an image.
          </div>
        )}

        {photoDataUrl && (
          <>
            <div className="form-section">
              <label>Item Name</label>
              <input
                type="text"
                placeholder="e.g., Vintage Typewriter"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <FieldWithManage
              label="Category"
              value={category}
              options={categories}
              placeholder="Choose a category"
              onChange={setCategory}
              onManage={() => setManagerKind("category")}
            />

            <FieldWithManage
              label="Location (optional)"
              value={itemLocation}
              options={locations}
              placeholder="No location selected"
              onChange={setItemLocation}
              onManage={() => setManagerKind("location")}
              optional
            />

            <TrackingField value={requiresTracking} onChange={setRequiresTracking} />
          </>
        )}

        {error && <div className="ui-section inline-message error-message">{error}</div>}

        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn-primary" onClick={handleSave} disabled={isSaving || !photoDataUrl}>
            {isSaving ? "Saving..." : "Save Item"}
          </button>
          <button className="btn-cancel" onClick={() => navigate("/inventory")}>
            Cancel
          </button>
        </div>
      </div>

      {managerKind && (
        <OptionManagerModal
          kind={managerKind}
          options={managerKind === "category" ? categories : locations}
          selectedValue={managerKind === "category" ? category : itemLocation}
          onSelectValue={managerKind === "category" ? setCategory : setItemLocation}
          onClose={() => setManagerKind(null)}
          onOptionsChanged={() => setOptionsVersion((value) => value + 1)}
        />
      )}
    </div>
  );
}

function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const [refresh, setRefresh] = useState(0);
  const [optionsVersion, setOptionsVersion] = useState(0);

  const item = useMemo(() => {
    void refresh;
    if (!id) return undefined;
    return getItems().find((currentItem) => currentItem.id === id);
  }, [id, refresh]);

  const categories = useMemo(() => {
    void optionsVersion;
    return getCategories();
  }, [optionsVersion]);

  const locations = useMemo(() => {
    void optionsVersion;
    return getLocations();
  }, [optionsVersion]);

  const [isEditing, setIsEditing] = useState(false);
  const [managerKind, setManagerKind] = useState<OptionManagerKind | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [requiresTracking, setRequiresTracking] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [estimatedReturnDate, setEstimatedReturnDate] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!item) return;
    setName(item.name ?? "");
    setCategory(item.category ?? categories[0] ?? "");
    setLocation(item.location ?? "");
    setRequiresTracking(Boolean(item.requiresTracking));
  }, [item]);

  useEffect(() => {
    if (category && !categories.includes(category)) {
      setCategory(categories[0] ?? "");
    }
  }, [category, categories]);

  useEffect(() => {
    if (location && !locations.includes(location)) {
      setLocation("");
    }
  }, [location, locations]);

  useEffect(() => {
    if ((routerLocation.state as { saved?: boolean } | null)?.saved) {
      setSaveSuccess(true);
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    }
  }, [routerLocation.key, routerLocation.state]);

  if (!item) {
    return (
      <div className="container">
        <h1>Item Not Found</h1>
        <button className="btn-cancel" onClick={() => navigate("/inventory")}>
          Back to Inventory
        </button>
      </div>
    );
  }

  const handleToggleCheckout = () => {
    if (item.checkedOut) {
      if (!window.confirm("Mark this item as returned (available)?")) return;
      setCheckedOut(item.id, false);
      setRefresh((value) => value + 1);
      return;
    }

    setEstimatedReturnDate(item.estimatedReturnDate ?? "");
    setCheckoutError("");
    setShowCheckoutModal(true);
  };

  const handleConfirmCheckout = () => {
    if (!estimatedReturnDate) {
      setCheckoutError("Estimated return date is required.");
      return;
    }

    setCheckedOutStatus(item.id, true, {
      checkedOutAt: Date.now(),
      estimatedReturnDate,
    });
    setShowCheckoutModal(false);
    setCheckoutError("");
    setRefresh((value) => value + 1);
  };

  const normalizedName = name.trim();
  const originalName = item.name.trim();
  const hasChanges =
    normalizedName !== originalName ||
    category !== item.category ||
    location !== (item.location ?? "") ||
    requiresTracking !== Boolean(item.requiresTracking);
  const isSaveDisabled = isSaving || !normalizedName || !category || !hasChanges;

  const handleSaveEdits = () => {
    setError("");

    if (!normalizedName) {
      setError("Item name is required.");
      return;
    }

    if (!category) {
      setError("Choose a category before saving.");
      return;
    }

    setIsSaving(true);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      upsertItem({
        ...item,
        name: normalizedName,
        category,
        location: location || undefined,
        requiresTracking,
        checkedOut: requiresTracking ? item.checkedOut : false,
        updatedAt: Date.now(),
      });

      setIsSaving(false);
      setIsEditing(false);
      setRefresh((value) => value + 1);
      setSaveSuccess(true);
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    }, 300);
  };

  const handleCancelEdits = () => {
    setName(item.name ?? "");
    setCategory(item.category ?? categories[0] ?? "");
    setLocation(item.location ?? "");
    setRequiresTracking(Boolean(item.requiresTracking));
    setError("");
    setIsEditing(false);
  };

  const handleConfirmDelete = () => {
    deleteItem(item.id);
    setShowDeleteModal(false);
    navigate("/inventory");
  };

  const statusLabel = item.requiresTracking
    ? item.checkedOut
      ? "Checked Out"
      : "Available"
    : "Non-tracked item"
    ;

  return (
    <div className="container">
      <h1>{isEditing ? "Edit Item" : item.name}</h1>

      <div className="ui-section">
        {item.photoDataUrl && (
          <div className="detail-photo-wrap">
            <img src={item.photoDataUrl} alt={item.name} className="detail-photo" />
          </div>
        )}

        <p>
          <strong>Item ID:</strong> {item.id}
        </p>

        {!isEditing ? (
          <>
            <p>
              <strong>Category:</strong> {item.category}
            </p>
            <p>
              <strong>Location:</strong> {item.location || "Not set"}
            </p>
            <p>
              <strong>Tracking:</strong> {item.requiresTracking ? "Yes" : "No"}
            </p>
            <p>
              <strong>Status:</strong> {statusLabel}
            </p>
            {item.checkedOutAt && (
              <p>
                <strong>Checked Out On:</strong> {formatDateTime(item.checkedOutAt)}
              </p>
            )}
            {item.estimatedReturnDate && (
              <p>
                <strong>Estimated Return Date:</strong> {formatDateLabel(item.estimatedReturnDate)}
              </p>
            )}
            <p>
              <strong>Updated:</strong> {formatRelativeTime(item.updatedAt)}
            </p>
            {!item.requiresTracking && (
              <div className="ui-section inline-message" style={{ marginTop: 16 }}>
                Check In and Check Out are disabled for non-tracked items.
              </div>
            )}
          </>
        ) : (
          <>
            <div className="form-section">
              <label>Item Name</label>
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </div>

            <FieldWithManage
              label="Category"
              value={category}
              options={categories}
              placeholder="Choose a category"
              onChange={setCategory}
              onManage={() => setManagerKind("category")}
            />

            <FieldWithManage
              label="Location (optional)"
              value={location}
              options={locations}
              placeholder="No location selected"
              onChange={setLocation}
              onManage={() => setManagerKind("location")}
              optional
            />

            <TrackingField value={requiresTracking} onChange={setRequiresTracking} />

            {error && <div className="ui-section inline-message error-message">{error}</div>}
          </>
        )}
      </div>

      {saveSuccess && <div className="ui-section inline-message">Item saved successfully.</div>}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {!isEditing ? (
          <>
            <button
              className="btn-primary"
              onClick={handleToggleCheckout}
              disabled={!item.requiresTracking}
              title={!item.requiresTracking ? "Non-tracked items cannot be checked in or out." : undefined}
            >
              {item.checkedOut ? "Return Item" : "Check Out Item"}
            </button>
            <button className="btn-cancel" onClick={() => setIsEditing(true)}>
              Edit
            </button>
            <button className="btn-cancel" onClick={() => navigate("/inventory")}>
              Back
            </button>
          </>
        ) : (
          <>
            <button className="btn-primary" onClick={handleSaveEdits} disabled={isSaveDisabled}>
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            <button
              className="btn-cancel"
              style={{ color: "#b91c1c" }}
              onClick={() => setShowDeleteModal(true)}
            >
              Delete Item
            </button>
            <button className="btn-cancel" onClick={handleCancelEdits}>
              Cancel
            </button>
          </>
        )}
      </div>

      {managerKind && (
        <OptionManagerModal
          kind={managerKind}
          options={managerKind === "category" ? categories : locations}
          selectedValue={managerKind === "category" ? category : location}
          onSelectValue={managerKind === "category" ? setCategory : setLocation}
          onClose={() => setManagerKind(null)}
          onOptionsChanged={() => {
            setOptionsVersion((value) => value + 1);
            setRefresh((value) => value + 1);
          }}
        />
      )}

      {showCheckoutModal && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowCheckoutModal(false)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Check out item"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Check Out {item.name}</h2>
              <button type="button" className="text-button" onClick={() => setShowCheckoutModal(false)}>
                Close
              </button>
            </div>

            <p className="helper-text" style={{ marginTop: 0 }}>
              Today&apos;s check-out date will be recorded automatically.
            </p>

            <div className="form-section">
              <label>Estimated return date</label>
              <input
                type="date"
                value={estimatedReturnDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(event) => {
                  setEstimatedReturnDate(event.target.value);
                  if (checkoutError) setCheckoutError("");
                }}
              />
            </div>

            {checkoutError && (
              <div className="ui-section inline-message error-message">{checkoutError}</div>
            )}

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
              <button type="button" className="btn-primary" onClick={handleConfirmCheckout}>
                Confirm Check Out
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setShowCheckoutModal(false);
                  setCheckoutError("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowDeleteModal(false)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Delete item"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Delete {item.name}?</h2>
              <button type="button" className="text-button" onClick={() => setShowDeleteModal(false)}>
                Close
              </button>
            </div>

            <p className="helper-text" style={{ marginTop: 0 }}>
              This action cannot be undone.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
              <button
                type="button"
                className="btn-primary"
                style={{ backgroundColor: "#dc2626" }}
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Scan() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "found" | "error">("idle");
  const [message, setMessage] = useState("");

  const startScan = async () => {
    setStatus("starting");
    setMessage("");

    try {
      const videoEl = videoRef.current;
      if (!videoEl) throw new Error("Video element not ready");

      const reader = new BrowserMultiFormatReader();
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      };

      setStatus("scanning");

      const controls = await reader.decodeFromConstraints(
        constraints,
        videoEl,
        (result) => {
          if (!result) return;

          const raw = result.getText().trim();
          if (!raw) return;

          setStatus("found");
          try {
            navigator.vibrate?.(50);
          } catch {
            // no-op
          }

          controls.stop();
          navigate(`/item/${encodeURIComponent(raw)}`);
        },
      );

      void controls;
    } catch (scanError: any) {
      setStatus("error");
      setMessage(scanError?.message ?? "Unable to start camera scan");
    }
  };

  return (
    <div className="container">
      <h1>Scan</h1>

      <p style={{ marginTop: 0 }}>
        Tap Start Scan, then point your camera at a QR code label.
      </p>

      {status !== "scanning" && (
        <button className="btn-primary" onClick={startScan}>
          {status === "starting" ? "Starting..." : "Start Scan"}
        </button>
      )}

      {message && <div className="ui-section inline-message">{message}</div>}

      <div className="ui-section" style={{ marginTop: 12 }}>
        <video ref={videoRef} style={{ width: "100%", borderRadius: 12 }} muted playsInline />
        <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
          Tip: if scanning is slow, improve lighting and fill the frame with the QR code.
        </div>
      </div>

      <button className="btn-cancel" style={{ marginTop: 12 }} onClick={() => navigate("/inventory")}>
        Back
      </button>
    </div>
  );
}

function TopNav() {
  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    fontWeight: isActive ? 700 : 500,
    textDecoration: "none",
  });

  return (
    <div className="container" style={{ display: "flex", gap: 12, marginBottom: 16 }}>
      <NavLink to="/inventory" style={linkStyle}>
        Inventory
      </NavLink>
      <NavLink to="/add" style={linkStyle}>
        Add Item
      </NavLink>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {DEMO_MODE && (
        <div className="container">
          <div className="ui-section" style={{ marginBottom: 16 }}>
            Demo version: changes are stored only in your browser and are not permanent.
          </div>
        </div>
      )}
      <TopNav />
      <Routes>
        <Route path="/" element={<Navigate to="/inventory" replace />} />
        <Route path="/inventory" element={<InventoryList />} />
        <Route path="/add" element={<AddItem />} />
        <Route path="/item/:id" element={<ItemDetail />} />
        <Route path="*" element={<Navigate to="/inventory" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
