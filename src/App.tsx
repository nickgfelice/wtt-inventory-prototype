import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import * as apiClient from "./lib/api";
import { getCurrentUser, logout } from "./lib/auth";
import * as demoClient from "./lib/demo";
import { getDemoItems } from "./lib/demo";
import type { AuthUser, Item } from "./lib/types";

import TopNav from "./components/TopNav";
import InventoryList from "./components/InventoryList";
import AddItem from "./components/AddItem";
import ItemDetail from "./components/ItemDetail";
import Scan from "./components/Scan";
import Login from "./components/Login";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
const client = DEMO_MODE ? demoClient : apiClient;

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(!DEMO_MODE);

  useEffect(() => {
    loadData();
    loadAuth();
  }, []);

  const canManageInventory = DEMO_MODE || Boolean(currentUser);

  const loadAuth = async () => {
    if (DEMO_MODE) {
      setIsAuthLoading(false);
      return;
    }

    try {
      setCurrentUser(await getCurrentUser());
    } catch {
      setCurrentUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await client.initialize();
      setItems(await client.getItems());
      setCategories(await client.getCategories());
      setLocations(await client.getLocations());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setItems(await client.getItems());
      setCategories(await client.getCategories());
      setLocations(await client.getLocations());
    } catch {
      // Silent refresh failure — data will be stale but app won't crash
    }
  };

  const handleLoadDemo = async () => {
    await client.setItems(getDemoItems());
    await refreshData();
  };

  const handleResetDemo = async () => {
    await client.clearItems();
    await refreshData();
  };

  return (
    <BrowserRouter>
      {DEMO_MODE && (
        <div className="container">
          <div className="ui-section" style={{ marginBottom: 16 }}>
            Demo version: changes are stored only in your browser and are not
            permanent.
          </div>
        </div>
      )}
      <TopNav
        user={currentUser}
        canManageInventory={canManageInventory}
        isAuthLoading={isAuthLoading}
        isDemoMode={DEMO_MODE}
        onLogout={handleLogout}
      />
      <Routes>
        <Route path="/" element={<Navigate to="/inventory" replace />} />
        <Route path="/login" element={<Login onLogin={setCurrentUser} />} />
        <Route
          path="/inventory"
          element={
            <InventoryList
              items={items}
              categories={categories}
              isLoading={isLoading}
              error={error}
              onRetry={loadData}
              isDemoMode={DEMO_MODE}
              onLoadDemo={handleLoadDemo}
              onResetDemo={handleResetDemo}
            />
          }
        />
        <Route
          path="/add"
          element={
            isAuthLoading ? (
              <div className="container">
                <h1>Add Item</h1>
                <div className="ui-section">Checking login...</div>
              </div>
            ) : canManageInventory ? (
              <AddItem
                categories={categories}
                locations={locations}
                upsertItem={async (item) => {
                  const saved = await client.upsertItem(item);
                  await refreshData();
                  return saved;
                }}
                addCategory={async (name) => {
                  const result = await client.addCategory(name);
                  await refreshData();
                  return result;
                }}
                renameCategory={async (currentName, newName) => {
                  const result = await client.renameCategory(currentName, newName);
                  await refreshData();
                  return result;
                }}
                deleteCategory={async (name) => {
                  const result = await client.deleteCategory(name);
                  await refreshData();
                  return result;
                }}
                addLocation={async (name) => {
                  const result = await client.addLocation(name);
                  await refreshData();
                  return result;
                }}
                renameLocation={async (currentName, newName) => {
                  const result = await client.renameLocation(currentName, newName);
                  await refreshData();
                  return result;
                }}
                deleteLocation={async (name) => {
                  const result = await client.deleteLocation(name);
                  await refreshData();
                  return result;
                }}
                onOptionsChanged={refreshData}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/item/:id"
          element={
            <ItemDetail
              getItemById={client.getItemById}
              upsertItem={async (item) => {
                const saved = await client.upsertItem(item);
                await refreshData();
                return saved;
              }}
              deleteItem={async (id) => {
                await client.deleteItem(id);
                await refreshData();
              }}
              setCheckedOutStatus={async (id, checkedOut, metadata) => {
                await client.setCheckedOutStatus(id, checkedOut, metadata);
                await refreshData();
              }}
              setCheckedOut={async (id, checkedOut) => {
                await client.setCheckedOut(id, checkedOut);
                await refreshData();
              }}
              canManageInventory={canManageInventory}
              categories={categories}
              locations={locations}
              addCategory={async (name) => {
                const result = await client.addCategory(name);
                await refreshData();
                return result;
              }}
              renameCategory={async (currentName, newName) => {
                const result = await client.renameCategory(currentName, newName);
                await refreshData();
                return result;
              }}
              deleteCategory={async (name) => {
                const result = await client.deleteCategory(name);
                await refreshData();
                return result;
              }}
              addLocation={async (name) => {
                const result = await client.addLocation(name);
                await refreshData();
                return result;
              }}
              renameLocation={async (currentName, newName) => {
                const result = await client.renameLocation(currentName, newName);
                await refreshData();
                return result;
              }}
              deleteLocation={async (name) => {
                const result = await client.deleteLocation(name);
                await refreshData();
                return result;
              }}
              onDataChanged={refreshData}
            />
          }
        />
        <Route path="/scan" element={<Scan />} />
        <Route path="*" element={<Navigate to="/inventory" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
