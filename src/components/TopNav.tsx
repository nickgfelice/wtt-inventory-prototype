import { NavLink } from "react-router-dom";

export default function TopNav() {
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
    </div>
  );
}
