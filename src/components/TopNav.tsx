import { NavLink } from "react-router-dom";
import type { AuthUser } from "../lib/types";
import wttLogo from "../assets/wtt-logo.png";

interface TopNavProps {
  user: AuthUser | null;
  canManageInventory: boolean;
  isAuthLoading: boolean;
  isDemoMode: boolean;
  onLogout: () => Promise<void>;
}

export default function TopNav({
  user,
  canManageInventory,
  isAuthLoading,
  isDemoMode,
  onLogout,
}: TopNavProps) {
  return (
    <div className="container top-nav">
      <nav className="top-nav-links">
        <NavLink to="/inventory" className={({ isActive }) => `top-nav-link${isActive ? " active" : ""}`}>
          Inventory
        </NavLink>
        {canManageInventory && (
          <NavLink to="/add" className={({ isActive }) => `top-nav-link${isActive ? " active" : ""}`}>
            Add Item
          </NavLink>
        )}
        {!canManageInventory && !isAuthLoading && (
          <NavLink to="/login" className={({ isActive }) => `top-nav-link${isActive ? " active" : ""}`}>
            Staff Login
          </NavLink>
        )}
      </nav>
      <div className="top-nav-right">
        {isDemoMode ? (
          <span className="user-pill">Demo mode</span>
        ) : user ? (
          <button type="button" className="btn btn-cancel nav-logout" onClick={onLogout}>
            Logout
          </button>
        ) : null}
        <img src={wttLogo} alt="Where to Turn" className="top-nav-logo" />
      </div>
    </div>
  );
}
