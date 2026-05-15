import { NavLink } from "react-router-dom";
import wttLogo from "../assets/wtt-logo.png";

export default function TopNav() {
  return (
    <div className="container top-nav">
      <nav className="top-nav-links">
        <NavLink to="/inventory" className={({ isActive }) => `top-nav-link${isActive ? " active" : ""}`}>
          Inventory
        </NavLink>
        <NavLink to="/add" className={({ isActive }) => `top-nav-link${isActive ? " active" : ""}`}>
          Add Item
        </NavLink>
      </nav>
      <img src={wttLogo} alt="Where to Turn" className="top-nav-logo" />
    </div>
  );
}
