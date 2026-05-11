import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";

import type { Item, OptionManagerKind, ManageActionResult } from "../lib/types";
import { readImageAsDataUrl, compressImageDataUrl } from "../lib/utils";
import FieldWithManage from "./FieldWithManage";
import TrackingField from "./TrackingField";
import OptionManagerModal from "./OptionManagerModal";

interface AddItemProps {
  categories: string[];
  locations: string[];
  upsertItem: (item: Omit<Item, "id"> & { id?: string }) => Promise<Item>;
  addCategory: (name: string) => Promise<ManageActionResult>;
  renameCategory: (currentName: string, newName: string) => Promise<ManageActionResult>;
  deleteCategory: (name: string) => Promise<ManageActionResult>;
  addLocation: (name: string) => Promise<ManageActionResult>;
  renameLocation: (currentName: string, newName: string) => Promise<ManageActionResult>;
  deleteLocation: (name: string) => Promise<ManageActionResult>;
  onOptionsChanged: () => void;
}

export default function AddItem(props: AddItemProps) {
  const {
    categories,
    locations,
    upsertItem,
    addCategory,
    renameCategory,
    deleteCategory,
    addLocation,
    renameLocation,
    deleteLocation,
    onOptionsChanged,
  } = props;

  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [itemLocation, setItemLocation] = useState("");
  const [requiresTracking, setRequiresTracking] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);
  const [managerKind, setManagerKind] = useState<OptionManagerKind | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

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

  const handlePhotoSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setIsLoadingPhoto(true);

    try {
      const dataUrl = await readImageAsDataUrl(file);
      setPhotoDataUrl(dataUrl);
    } catch (selectionError: unknown) {
      const message =
        selectionError instanceof Error
          ? selectionError.message
          : "Unable to load that image.";
      setError(message);
    } finally {
      setIsLoadingPhoto(false);
    }
  };

  const handleSave = async () => {
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

    try {
      // Compress the photo and store as base64 in the Sheet
      const compressedUrl = await compressImageDataUrl(photoDataUrl);

      // Create the item with the compressed photo
      const saved = await upsertItem({
        name: trimmedName,
        category,
        location: itemLocation || undefined,
        photoUrl: compressedUrl,
        requiresTracking,
        checkedOut: false,
        updatedAt: Date.now(),
      });

      navigate(`/item/${encodeURIComponent(saved.id)}`, { state: { saved: true } });
    } catch (saveError: unknown) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Unable to save item. Please try again.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
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
          onOptionsChanged={onOptionsChanged}
          addOption={managerKind === "category" ? addCategory : addLocation}
          renameOption={managerKind === "category" ? renameCategory : renameLocation}
          deleteOption={managerKind === "category" ? deleteCategory : deleteLocation}
        />
      )}
    </div>
  );
}
