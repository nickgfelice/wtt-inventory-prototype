import { NavLink } from "react-router-dom";
import wttLogo from "../assets/wtt-logo.png";

export default function TopNav() {
  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    fontWeight: isActive ? 700 : 500,
    textDecoration: "none",
  });

  return (
    <div className="container top-nav">
      <div className="top-nav-links">
        <NavLink to="/inventory" style={linkStyle}>
          Inventory
        </NavLink>
        <NavLink to="/add" style={linkStyle}>
          Add Item
        </NavLink>
      </div>
      <img src={wttLogo} alt="Where to Turn" className="top-nav-logo" />
    </div>
  );
}
