import { useState } from "react";
import type { OptionManagerKind, ManageActionResult } from "../lib/types";

export default function OptionManagerModal(props: {
  kind: OptionManagerKind;
  options: string[];
  selectedValue: string;
  onSelectValue: (value: string) => void;
  onClose: () => void;
  onOptionsChanged: () => void;
  addOption: (name: string) => Promise<ManageActionResult>;
  renameOption: (currentName: string, nextName: string) => Promise<ManageActionResult>;
  deleteOption: (name: string) => Promise<ManageActionResult>;
}) {
  const [newName, setNewName] = useState("");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [error, setError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const label = props.kind === "category" ? "category" : "location";
  const title = props.kind === "category" ? "Manage Categories" : "Manage Locations";

  const handleAdd = async () => {
    setIsAdding(true);
    setError("");
    try {
      const result = await props.addOption(newName);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNewName("");
      props.onSelectValue(result.value);
      props.onOptionsChanged();
    } finally {
      setIsAdding(false);
    }
  };

  const handleRename = async (currentName: string) => {
    setIsRenaming(true);
    setError("");
    try {
      const result = await props.renameOption(currentName, editingValue);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditingName(null);
      setEditingValue("");
      if (props.selectedValue === currentName) {
        props.onSelectValue(result.value);
      }
      props.onOptionsChanged();
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Delete this ${label}?`)) return;

    setIsDeleting(name);
    setError("");
    try {
      const result = await props.deleteOption(name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      props.onOptionsChanged();
    } finally {
      setIsDeleting(null);
    }
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
            <button
              type="button"
              className="btn-primary"
              onClick={handleAdd}
              disabled={isAdding}
            >
              {isAdding ? "Adding..." : "Add"}
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
                        disabled={isDeleting !== null}
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
                        disabled={isDeleting !== null}
                        onClick={() => handleDelete(option)}
                      >
                        {isDeleting === option ? "Deleting..." : "Delete"}
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
                        disabled={isRenaming}
                      >
                        {isRenaming ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        className="btn-cancel"
                        disabled={isRenaming}
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
