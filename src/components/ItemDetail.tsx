import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import type { Item, OptionManagerKind, ManageActionResult } from "../lib/types";
import { formatRelativeTime, formatDateTime, formatDateLabel } from "../lib/utils";
import FieldWithManage from "./FieldWithManage";
import TrackingField from "./TrackingField";
import OptionManagerModal from "./OptionManagerModal";

interface ItemDetailProps {
  getItemById: (id: string) => Promise<Item | undefined>;
  upsertItem: (item: Omit<Item, "id"> & { id?: string }) => Promise<Item>;
  deleteItem: (id: string) => Promise<void>;
  setCheckedOutStatus: (
    id: string,
    checkedOut: boolean,
    metadata?: { checkedOutAt?: number; estimatedReturnDate?: string; organizationName?: string },
  ) => Promise<void>;
  setCheckedOut: (id: string, checkedOut: boolean) => Promise<void>;
  categories: string[];
  locations: string[];
  addCategory: (name: string) => Promise<ManageActionResult>;
  renameCategory: (currentName: string, newName: string) => Promise<ManageActionResult>;
  deleteCategory: (name: string) => Promise<ManageActionResult>;
  addLocation: (name: string) => Promise<ManageActionResult>;
  renameLocation: (currentName: string, newName: string) => Promise<ManageActionResult>;
  deleteLocation: (name: string) => Promise<ManageActionResult>;
  onDataChanged: () => void;
}

export default function ItemDetail(props: ItemDetailProps) {
  const {
    getItemById,
    upsertItem,
    deleteItem,
    setCheckedOutStatus,
    setCheckedOut,
    categories,
    locations,
    addCategory,
    renameCategory,
    deleteCategory,
    addLocation,
    renameLocation,
    deleteLocation,
    onDataChanged,
  } = props;

  const { id } = useParams();
  const navigate = useNavigate();
  const routerLocation = useLocation();

  // Item loading state
  const [item, setItem] = useState<Item | undefined>(undefined);
  const [isLoadingItem, setIsLoadingItem] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [managerKind, setManagerKind] = useState<OptionManagerKind | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [requiresTracking, setRequiresTracking] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Checkout modal state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [estimatedReturnDate, setEstimatedReturnDate] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  // Load item on mount and when id changes
  const loadItem = async () => {
    if (!id) {
      setIsLoadingItem(false);
      setLoadError("No item ID provided.");
      return;
    }

    setIsLoadingItem(true);
    setLoadError("");

    try {
      const fetched = await getItemById(id);
      setItem(fetched);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unable to load item. Please try again.";
      setLoadError(message);
    } finally {
      setIsLoadingItem(false);
    }
  };

  useEffect(() => {
    loadItem();
  }, [id]);

  // Populate edit form when item loads
  useEffect(() => {
    if (!item) return;
    setName(item.name ?? "");
    setCategory(item.category ?? categories[0] ?? "");
    setLocation(item.location ?? "");
    setDescription(item.description ?? "");
    setRequiresTracking(Boolean(item.requiresTracking));
  }, [item]);

  // Keep category in sync with available categories
  useEffect(() => {
    if (category && !categories.includes(category)) {
      setCategory(categories[0] ?? "");
    }
  }, [category, categories]);

  // Keep location in sync with available locations
  useEffect(() => {
    if (location && !locations.includes(location)) {
      setLocation("");
    }
  }, [location, locations]);

  // Show save success banner from navigation state
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

  // Loading state
  if (isLoadingItem) {
    return (
      <div className="container">
        <h1>Item Detail</h1>
        <div className="ui-section" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div aria-label="Loading item">Loading item…</div>
        </div>
      </div>
    );
  }

  // Error state (load failure)
  if (loadError) {
    return (
      <div className="container">
        <h1>Item Detail</h1>
        <div className="ui-section" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div className="error-message" style={{ display: "inline-block", marginBottom: 16 }}>
            {loadError}
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={loadItem}>
              Retry
            </button>
            <button className="btn btn-cancel" onClick={() => navigate("/inventory")}>
              Back to Inventory
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Item not found
  if (!item) {
    return (
      <div className="container">
        <h1>Item Not Found</h1>
        <button className="btn btn-cancel" onClick={() => navigate("/inventory")}>
          Back to Inventory
        </button>
      </div>
    );
  }

  const handleToggleCheckout = async () => {
    if (item.checkedOut) {
      if (!window.confirm("Mark this item as returned (available)?")) return;

      setIsCheckingOut(true);
      try {
        await setCheckedOut(item.id, false);
        const updated = await getItemById(item.id);
        setItem(updated);
        onDataChanged();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unable to return item. Please try again.";
        setError(message);
      } finally {
        setIsCheckingOut(false);
      }
      return;
    }

    setEstimatedReturnDate(item.estimatedReturnDate ?? "");
    setOrganizationName("");
    setCheckoutError("");
    setShowCheckoutModal(true);
  };

  const handleConfirmCheckout = async () => {
    if (!organizationName.trim()) {
      setCheckoutError("Organization name is required.");
      return;
    }

    if (!estimatedReturnDate) {
      setCheckoutError("Estimated return date is required.");
      return;
    }

    setIsCheckingOut(true);
    try {
      await setCheckedOutStatus(item.id, true, {
        checkedOutAt: Date.now(),
        estimatedReturnDate,
        organizationName: organizationName.trim(),
      });
      setShowCheckoutModal(false);
      setCheckoutError("");
      const updated = await getItemById(item.id);
      setItem(updated);
      onDataChanged();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unable to check out item. Please try again.";
      setCheckoutError(message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const normalizedName = name.trim();
  const originalName = item.name.trim();
  const hasChanges =
    normalizedName !== originalName ||
    category !== item.category ||
    location !== (item.location ?? "") ||
    description !== (item.description ?? "") ||
    requiresTracking !== Boolean(item.requiresTracking);
  const isSaveDisabled = isSaving || !normalizedName || !category || !hasChanges;

  const handleSaveEdits = async () => {
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

    try {
      await upsertItem({
        ...item,
        name: normalizedName,
        category,
        location: location || undefined,
        description: description.trim() || undefined,
        requiresTracking,
        checkedOut: requiresTracking ? item.checkedOut : false,
        updatedAt: Date.now(),
      });

      const updated = await getItemById(item.id);
      setItem(updated);
      setIsEditing(false);
      onDataChanged();

      setSaveSuccess(true);
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unable to save changes. Please try again.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdits = () => {
    setName(item.name ?? "");
    setCategory(item.category ?? categories[0] ?? "");
    setLocation(item.location ?? "");
    setDescription(item.description ?? "");
    setRequiresTracking(Boolean(item.requiresTracking));
    setError("");
    setIsEditing(false);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteItem(item.id);
      setShowDeleteModal(false);
      onDataChanged();
      navigate("/inventory");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unable to delete item. Please try again.";
      setError(message);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const statusLabel = item.requiresTracking
    ? item.checkedOut
      ? "Checked Out"
      : "Available"
    : "Non-tracked item";

  return (
    <div className="container">
      <h1>{isEditing ? "Edit Item" : item.name}</h1>

      <div className="ui-section">
        {item.photoUrl && (
          <div className="detail-photo-wrap">
            <img src={item.photoUrl} alt={item.name} className="detail-photo" />
          </div>
        )}

        {!isEditing && item.checkedOut && (item.organizationName || item.estimatedReturnDate || item.description) && (
          <div className="checkout-highlight">
            <div className="checkout-highlight-title">Checkout Details</div>
            <div className="checkout-highlight-fields">
              {item.organizationName && (
                <div className="checkout-highlight-field">
                  <span className="field-label">Organization</span>
                  <span className="field-value">{item.organizationName}</span>
                </div>
              )}
              {item.estimatedReturnDate && (
                <div className="checkout-highlight-field">
                  <span className="field-label">Estimated Return</span>
                  <span className="field-value">{formatDateLabel(item.estimatedReturnDate)}</span>
                </div>
              )}
            </div>
            {item.description && (
              <div className="checkout-highlight-description">
                <span className="field-label">Description</span>
                <span className="field-value">{item.description}</span>
              </div>
            )}
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
            {item.description && (
              <p>
                <strong>Description:</strong> {item.description}
              </p>
            )}
            <p>
              <strong>Tracking:</strong> {item.requiresTracking ? "Yes" : "No"}
            </p>
            {item.checkedOutAt && (
              <p>
                <strong>Checked Out On:</strong> {formatDateTime(item.checkedOutAt)}
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

            <div className="form-section">
              <label>Description (optional)</label>
              <textarea
                placeholder="Add a description for this item..."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
              />
            </div>

            {error && (
              <div className="ui-section inline-message error-message">{error}</div>
            )}
          </>
        )}
      </div>

      {saveSuccess && (
        <div className="ui-section inline-message">Item saved successfully.</div>
      )}

      {!isEditing && error && (
        <div className="ui-section inline-message error-message">{error}</div>
      )}

      <div className="button-group">
        {!isEditing ? (
          <>
            <button
              className="btn btn-primary"
              onClick={handleToggleCheckout}
              disabled={!item.requiresTracking || isCheckingOut}
              title={
                !item.requiresTracking
                  ? "Non-tracked items cannot be checked in or out."
                  : undefined
              }
            >
              {isCheckingOut
                ? "Processing..."
                : item.checkedOut
                  ? "Return Item"
                  : "Check Out Item"}
            </button>
            <button className="btn btn-cancel" onClick={() => setIsEditing(true)}>
              Edit
            </button>
            <button className="btn btn-cancel" onClick={() => navigate("/inventory")}>
              Back
            </button>
          </>
        ) : (
          <>
            <button
              className="btn btn-primary"
              onClick={handleSaveEdits}
              disabled={isSaveDisabled}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            <button
              className="btn btn-cancel"
              style={{ color: "#b91c1c" }}
              onClick={() => setShowDeleteModal(true)}
            >
              Delete Item
            </button>
            <button className="btn btn-cancel" onClick={handleCancelEdits}>
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
          onOptionsChanged={onDataChanged}
          addOption={managerKind === "category" ? addCategory : addLocation}
          renameOption={managerKind === "category" ? renameCategory : renameLocation}
          deleteOption={managerKind === "category" ? deleteCategory : deleteLocation}
        />
      )}

      {showCheckoutModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setShowCheckoutModal(false)}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Check out item"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Check Out {item.name}</h2>
              <button
                type="button"
                className="text-button"
                onClick={() => setShowCheckoutModal(false)}
              >
                Close
              </button>
            </div>

            <p className="helper-text" style={{ marginTop: 0 }}>
              Today&apos;s check-out date will be recorded automatically.
            </p>

            <div className="form-section">
              <label className="required">Organization Name</label>
              <input
                type="text"
                placeholder="Enter organization name"
                value={organizationName}
                onChange={(event) => {
                  setOrganizationName(event.target.value);
                  if (checkoutError) setCheckoutError("");
                }}
              />
            </div>

            <div className="form-section">
              <label className="required">Estimated return date</label>
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
              <div className="ui-section inline-message error-message">
                {checkoutError}
              </div>
            )}

            <div className="button-group">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmCheckout}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? "Checking out..." : "Confirm Check Out"}
              </button>
              <button
                type="button"
                className="btn btn-cancel"
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
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Delete item"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Delete {item.name}?</h2>
              <button
                type="button"
                className="text-button"
                onClick={() => setShowDeleteModal(false)}
              >
                Close
              </button>
            </div>

            <p className="helper-text" style={{ marginTop: 0 }}>
              This action cannot be undone.
            </p>

            <div className="button-group">
              <button
                type="button"
                className="btn btn-primary"
                style={{ backgroundColor: "#dc2626" }}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
              <button
                type="button"
                className="btn btn-cancel"
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
