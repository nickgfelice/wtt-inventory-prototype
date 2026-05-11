import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import * as apiClient from "./lib/api";
import * as demoClient from "./lib/demo";
import { getDemoItems } from "./lib/demo";
import type { Item } from "./lib/types";

import TopNav from "./components/TopNav";
import InventoryList from "./components/InventoryList";
import AddItem from "./components/AddItem";
import ItemDetail from "./components/ItemDetail";
import Scan from "./components/Scan";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
const client = DEMO_MODE ? demoClient : apiClient;

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

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
      <TopNav />
      <Routes>
        <Route path="/" element={<Navigate to="/inventory" replace />} />
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
