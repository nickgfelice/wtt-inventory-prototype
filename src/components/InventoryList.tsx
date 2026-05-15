import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Item } from "../lib/types";
import { formatDateTime, formatDateLabel } from "../lib/utils";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

interface InventoryListProps {
  items: Item[];
  categories: string[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  isDemoMode: boolean;
  onLoadDemo?: () => void;
  onResetDemo?: () => void;
}

export default function InventoryList({
  items: allItems,
  categories,
  isLoading,
  error,
  onRetry,
  isDemoMode,
  onLoadDemo,
  onResetDemo,
}: InventoryListProps) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [checkedOutFilter, setCheckedOutFilter] = useState("All");
  const navigate = useNavigate();

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

  // Loading state
  if (isLoading) {
    return (
      <div className="container">
        <h1>Inventory</h1>
        <div className="ui-section" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div aria-label="Loading inventory data">Loading inventory data…</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container">
        <h1>Inventory</h1>
        <div className="ui-section" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div className="error-message" style={{ display: "inline-block", marginBottom: 16 }}>
            {error}
          </div>
          <div>
            <button className="btn btn-primary" onClick={onRetry}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

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

      <div
        className="ui-section"
        style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
      >
        <div style={{ minWidth: 200 }}>
          <label>Category</label>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option>All</option>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: 200 }}>
          <label>Checked Out</label>
          <select
            value={checkedOutFilter}
            onChange={(event) => setCheckedOutFilter(event.target.value)}
          >
            <option>All</option>
            <option>Available</option>
            <option>Checked Out</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button className="btn btn-cancel" onClick={handleClearFilters}>
            Clear
          </button>
        </div>
      </div>

      {isDemoMode && DEMO_MODE && (
        <div
          className="ui-section"
          style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
        >
          {onLoadDemo && (
            <button className="btn btn-primary" onClick={onLoadDemo}>
              Load demo data
            </button>
          )}
          {onResetDemo && (
            <button className="btn btn-cancel" onClick={onResetDemo}>
              Reset demo
            </button>
          )}
        </div>
      )}

      {allItems.length === 0 ? (
        <div className="ui-section empty-state">
          <div className="empty-state-title">
            No inventory items yet. Add your first item to get started.
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="ui-section empty-state">
          <div className="empty-state-title">No results match your search or filters.</div>
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-cancel" onClick={handleClearFilters}>
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
                    {item.photoUrl ? (
                      <img
                        src={item.photoUrl}
                        alt={item.name}
                        className="inventory-thumbnail"
                      />
                    ) : (
                      <div
                        className="inventory-thumbnail inventory-thumbnail-placeholder"
                        aria-label="No image"
                      >
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
                        {item.checkedOutAt && (
                          <div>Out: {formatDateTime(item.checkedOutAt)}</div>
                        )}
                        {item.estimatedReturnDate && (
                          <div>
                            Est. return: {formatDateLabel(item.estimatedReturnDate)}
                          </div>
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
