import { useMemo, useState } from "react";
import { useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";

import { getItems, setCheckedOut, nextItemId, upsertItem, setItems, clearItems, type Item } from "./lib/storage";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

const getDemoItems = (): Item[] => {
  const now = Date.now();
  return [
    { id: "WTT-000101", name: "Royal Quiet De Luxe", category: "Typewriters", location: "Aisle 1 / Shelf A", condition: "Good", checkedOut: false, updatedAt: now - 1000 * 60 * 60 * 2 },
    { id: "WTT-000102", name: "Underwood No. 5", category: "Typewriters", location: "Aisle 1 / Shelf B", condition: "Fair", checkedOut: true, updatedAt: now - 1000 * 60 * 60 * 24 },
    { id: "WTT-000103", name: "Olympia SM9", category: "Typewriters", location: "Aisle 1 / Shelf C", condition: "Excellent", checkedOut: false, updatedAt: now - 1000 * 60 * 15 },
    { id: "WTT-000104", name: "Canon AE-1", category: "Cameras", location: "Aisle 2 / Shelf A", condition: "Good", checkedOut: false, updatedAt: now - 1000 * 60 * 60 * 6 },
    { id: "WTT-000105", name: "Nikon FM2", category: "Cameras", location: "Aisle 2 / Shelf B", condition: "Good", checkedOut: true, updatedAt: now - 1000 * 60 * 60 * 48 },
    { id: "WTT-000106", name: "Polaroid SX-70", category: "Cameras", location: "Aisle 2 / Shelf C", condition: "Fair", checkedOut: false, updatedAt: now - 1000 * 60 * 60 * 10 },
    { id: "WTT-000107", name: "Victorian Writing Desk", category: "Furniture", location: "Bay 3", condition: "Good", checkedOut: false, updatedAt: now - 1000 * 60 * 90 },
    { id: "WTT-000108", name: "Oak Rolltop Desk", category: "Furniture", location: "Bay 3", condition: "Needs Repair", checkedOut: false, updatedAt: now - 1000 * 60 * 60 * 72 },
    { id: "WTT-000109", name: "Art Deco Sideboard", category: "Furniture", location: "Bay 4", condition: "Good", checkedOut: true, updatedAt: now - 1000 * 60 * 60 * 30 },
    { id: "WTT-000110", name: "Gaslight Street Lamp", category: "Set Pieces", location: "Back Lot", condition: "Good", checkedOut: false, updatedAt: now - 1000 * 60 * 60 * 5 },
    { id: "WTT-000111", name: "Library Book Wall", category: "Set Pieces", location: "Stage B", condition: "Excellent", checkedOut: false, updatedAt: now - 1000 * 60 * 60 * 12 },
    { id: "WTT-000112", name: "Paris Cafe Table", category: "Set Pieces", location: "Stage C", condition: "Good", checkedOut: true, updatedAt: now - 1000 * 60 * 60 * 18 },
    { id: "WTT-000113", name: "1940s Trench Coat", category: "Costumes", location: "Wardrobe 1", condition: "Good", checkedOut: false, updatedAt: now - 1000 * 60 * 35 },
    { id: "WTT-000114", name: "Victorian Gown", category: "Costumes", location: "Wardrobe 2", condition: "Fair", checkedOut: true, updatedAt: now - 1000 * 60 * 60 * 20 },
    { id: "WTT-000115", name: "Pirate Captain Coat", category: "Costumes", location: "Wardrobe 3", condition: "Good", checkedOut: false, updatedAt: now - 1000 * 60 * 60 * 8 },
    { id: "WTT-000116", name: "Brass Telescope", category: "Props", location: "Props Cage A", condition: "Good", checkedOut: false, updatedAt: now - 1000 * 60 * 60 * 3 },
    { id: "WTT-000117", name: "Antique Compass", category: "Props", location: "Props Cage B", condition: "Excellent", checkedOut: false, updatedAt: now - 1000 * 60 * 60 * 14 },
    { id: "WTT-000118", name: "Leather Satchel", category: "Props", location: "Props Cage C", condition: "Good", checkedOut: true, updatedAt: now - 1000 * 60 * 60 * 40 },
  ];
};
function InventoryList() {
  const [query, setQuery] = useState("");
  const [refresh, setRefresh] = useState(0);
  // NEW: filter state for category + checked out
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [checkedOutFilter, setCheckedOutFilter] = useState("All");
  const navigate = useNavigate();

  // NEW: get all items to distinguish empty inventory vs filtered results
  const allItems = useMemo(() => {
    void refresh;
    return getItems();
  }, [refresh]);

  const items = useMemo(() => {
    const all = allItems;
    const q = query.trim().toLowerCase();
    return all.filter((it) => {
      const matchesQuery =
        !q ||
        it.id.toLowerCase().includes(q) ||
        it.name.toLowerCase().includes(q) ||
        it.category.toLowerCase().includes(q);

      const matchesCategory =
        categoryFilter === "All" || it.category === categoryFilter;

      const matchesCheckedOut =
        checkedOutFilter === "All" ||
        (checkedOutFilter === "Available" && !it.checkedOut) ||
        (checkedOutFilter === "Checked Out" && it.checkedOut);

      return matchesQuery && matchesCategory && matchesCheckedOut;
    });
  }, [allItems, query, categoryFilter, checkedOutFilter]);

  // NEW: reset all filters + search
  const handleClearFilters = () => {
    setQuery("");
    setCategoryFilter("All");
    setCheckedOutFilter("All");
  };

  // NEW: demo controls for seeded data
  const handleLoadDemo = () => {
    setItems(getDemoItems());
    setRefresh((x) => x + 1);
  };

  const handleResetDemo = () => {
    clearItems();
    setRefresh((x) => x + 1);
  };

  return (
    <div className="container">
      <h1>Inventory</h1>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search items by ID, name, or category..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* NEW: filters + clear */}
      <div
        className="ui-section"
        style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
      >
        <div style={{ minWidth: 200 }}>
          <label>Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option>All</option>
            <option>Typewriters</option>
            <option>Cameras</option>
            <option>Set Pieces</option>
            <option>Furniture</option>
            <option>Costumes</option>
            <option>Props</option>
          </select>
        </div>

        <div style={{ minWidth: 200 }}>
          <label>Checked Out</label>
          <select
            value={checkedOutFilter}
            onChange={(e) => setCheckedOutFilter(e.target.value)}
          >
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
        <div
          className="ui-section"
          style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
        >
          <button className="btn-primary" onClick={handleLoadDemo}>
            Load demo data
          </button>
          <button className="btn-cancel" onClick={handleResetDemo}>
            Reset demo
          </button>
        </div>
      )}

      {allItems.length === 0 ? (
        // NEW: empty state when inventory is empty
        <div
          className="ui-section"
          style={{
            textAlign: "center",
            padding: "48px 24px",
            color: "#4b5563",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>
            No inventory items yet. Add your first item to get started.
          </div>
        </div>
      ) : items.length === 0 ? (
        // NEW: empty state when filters/search yield no results
        <div
          className="ui-section"
          style={{
            textAlign: "center",
            padding: "48px 24px",
            color: "#4b5563",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>
            No results match your search or filters.
          </div>
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
                <th>Item ID</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Checked Out</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr
                  key={it.id}
                  onClick={() => navigate(`/item/${encodeURIComponent(it.id)}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{it.id}</td>
                  <td>{it.name}</td>
                  <td>{it.category}</td>
                  <td>{it.checkedOut ? "Yes" : "No"}</td>
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

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Typewriters");
const [itemLocation, setItemLocation] = useState("");
  const [condition, setCondition] = useState<"Excellent" | "Good" | "Fair" | "Needs Repair">("Good");
  const [error, setError] = useState<string>("");
  // NEW: saving state + timeout ref
  const [isSaving, setIsSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const handleSave = () => {
    setError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Item name is required.");
      return;
    }

    // NEW: simulate save latency + disable button
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
        location: itemLocation.trim() || undefined,
        condition,
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
        <div className="form-section">
          <label>Item Name</label>
          <input
            type="text"
            placeholder="e.g., Vintage Typewriter"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-section">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option>Typewriters</option>
            <option>Cameras</option>
            <option>Set Pieces</option>
            <option>Furniture</option>
            <option>Costumes</option>
            <option>Props</option>
          </select>
        </div>

        <div className="form-section">
          <label>Location (optional)</label>
          <input
            type="text"
            placeholder="e.g., Aisle 2 / Shelf B"
            value={itemLocation}
            onChange={(e) => setItemLocation(e.target.value)}
          />
        </div>

        <div className="form-section">
          <label>Condition</label>
          <select value={condition} onChange={(e) => setCondition(e.target.value as any)}>
            <option value="Excellent">Excellent</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Needs Repair">Needs Repair</option>
          </select>
        </div>

        {error && (
          <div className="ui-section" style={{ marginTop: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Item"}
          </button>
          <button className="btn-cancel" onClick={() => navigate("/inventory")}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const routerlocation = useLocation();
  const [refresh, setRefresh] = useState(0);

  const item = useMemo(() => {
    void refresh;
    if (!id) return undefined;
    return getItems().find((x) => x.id === id);
  }, [id, refresh]);

  const [isEditing, setIsEditing] = useState(false);

  // Local editable fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Typewriters");
  const [location, setLocation] = useState("");
  const [condition, setCondition] = useState<"Excellent" | "Good" | "Fair" | "Needs Repair">("Good");
  const [error, setError] = useState<string>("");
  // NEW: saving + success states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  // When item loads (or changes), populate edit fields once
  useEffect(() => {
    if (!item) return;
    setName(item.name ?? "");
    setCategory(item.category ?? "Typewriters");
    setLocation(item.location ?? "");
    setCondition((item.condition as any) ?? "Good");
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const confirmMessage = item.checkedOut
      ? "Mark this item as returned (available)?"
      : "Mark this item as checked out?";
    if (!window.confirm(confirmMessage)) {
      return;
    }
    setCheckedOut(item.id, !item.checkedOut);
    setRefresh((x) => x + 1);
  };

  // NEW: validation + change detection for Save Changes
  const normalizedName = name.trim();
  const normalizedLocation = location.trim();
  const originalName = (item.name ?? "").trim();
  const originalLocation = (item.location ?? "").trim();
  const isNameValid = normalizedName.length > 0;
  const hasChanges =
    normalizedName !== originalName ||
    category !== (item.category ?? "Typewriters") ||
    normalizedLocation !== originalLocation ||
    condition !== ((item.condition as any) ?? "Good");
  const isSaveDisabled = isSaving || !isNameValid || !hasChanges;

  const handleSaveEdits = () => {
    setError("");
    if (!isNameValid) {
      setError("Item name is required.");
      return;
    }

    // NEW: simulate save latency + disable button
    setIsSaving(true);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      upsertItem({
        ...item,
        name: normalizedName,
        category,
        location: normalizedLocation || undefined,
        condition,
        updatedAt: Date.now(),
      });

      setIsSaving(false);
      setIsEditing(false);
      setRefresh((x) => x + 1);

      // NEW: show temporary success message
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
    // revert fields
    setName(item.name ?? "");
    setCategory(item.category ?? "Typewriters");
    setLocation(item.location ?? "");
    setCondition((item.condition as any) ?? "Good");
    setError("");
    setIsEditing(false);
  };

  useEffect(() => {
    // NEW: show success message when arriving from add flow
    if ((routerlocation.state as any)?.saved) {
      setSaveSuccess(true);
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    }
  }, [routerlocation.key]);

  return (
    <div className="container">
      <h1>{isEditing ? "Edit Item" : item.name}</h1>

      <div className="ui-section">
        <p><strong>Item ID:</strong> {item.id}</p>

        {!isEditing ? (
          <>
            <p><strong>Category:</strong> {item.category}</p>
            <p><strong>Location:</strong> {item.location}</p>
            <p><strong>Condition:</strong> {item.condition}</p>
            <p>
              <strong>Status:</strong>{" "}
              {item.checkedOut ? "Checked Out" : "Available"}
            </p>
          </>
        ) : (
          <>
            <div className="form-section">
              <label>Item Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="form-section">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option>Typewriters</option>
                <option>Cameras</option>
                <option>Set Pieces</option>
                <option>Furniture</option>
                <option>Costumes</option>
                <option>Props</option>
              </select>
            </div>

            <div className="form-section">
              <label>Location (optional)</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Aisle 2 / Shelf B"
              />
            </div>

            <div className="form-section">
              <label>Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Needs Repair">Needs Repair</option>
              </select>
            </div>

            {error && (
              <div className="ui-section" style={{ marginTop: 12 }}>
                {error}
              </div>
            )}
          </>
        )}
      </div>

      {saveSuccess && (
        // NEW: success feedback after save
        <div className="ui-section" style={{ marginTop: 12 }}>
          Item saved successfully.
        </div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {!isEditing ? (
          <>
            <button className="btn-primary" onClick={handleToggleCheckout}>
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
            <button className="btn-cancel" onClick={handleCancelEdits}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Scan() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [status, setStatus] = useState<
    "idle" | "starting" | "scanning" | "found" | "error"
  >("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    // cleanup on unmount
    return () => {
      // nothing to cleanup here because we stop the reader when we start scanning
    };
  }, []);

  const startScan = async () => {
    setStatus("starting");
    setMessage("");

    try {
      const videoEl = videoRef.current;
      if (!videoEl) throw new Error("Video element not ready");

      const reader = new BrowserMultiFormatReader();

      // Prefer back camera on phones (including iPhone)
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      };

      // This method asks for permission and starts decoding continuously
      setStatus("scanning");

      const controls = await reader.decodeFromConstraints(
        constraints,
        videoEl,
        (result, err, _controls) => {
          if (result) {
            const raw = result.getText().trim();

            // Basic validation: expect an ID like WTT-000123
            if (!raw) return;

            setStatus("found");
            try {
              navigator.vibrate?.(50);
            } catch {}

            // Stop scanning before navigating
            controls.stop();

            navigate(`/item/${encodeURIComponent(raw)}`);
          }
        }
      );

      // Note: we intentionally do not store controls in state for MVP.
      // Navigating away stops decoding due to component unmount.
      // If user stays on page, scanning continues until a code is found.
      void controls;
    } catch (e: any) {
      setStatus("error");
      setMessage(e?.message ?? "Unable to start camera scan");
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

      {message && (
        <div className="ui-section" style={{ marginTop: 12 }}>
          {message}
        </div>
      )}

      <div className="ui-section" style={{ marginTop: 12 }}>
        <video
          ref={videoRef}
          style={{ width: "100%", borderRadius: 12 }}
          muted
          playsInline
        />
        <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
          Tip: if scanning is slow, improve lighting and fill the frame with the
          QR code.
        </div>
      </div>

      <button
        className="btn-cancel"
        style={{ marginTop: 12 }}
        onClick={() => navigate("/inventory")}
      >
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
      <NavLink to="/scan" style={linkStyle}>
        Scan
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
        <Route path="/scan" element={<Scan />} />
        <Route path="/item/:id" element={<ItemDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
