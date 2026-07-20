import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleLogout() {
    logout();
    closeMenu();
    navigate("/");
  }

  return (
    <header className="navbar">
      <Link to="/" className="brand" onClick={closeMenu}>
        <span className="brand-mark">P</span>
        <span>ParkSpot</span>
      </Link>

      <nav className="nav-links">
        <Link to="/find">Find parking</Link>
        {user && <Link to="/bookings">My bookings</Link>}
        {user && <Link to="/vehicles">My vehicles</Link>}
        {user && <Link to="/list-space">List your space</Link>}
        {user && <Link to="/scan">Scan check-in</Link>}
        {user?.isAdmin && <Link to="/admin">Admin</Link>}
      </nav>

      <div className="nav-auth">
        {user ? (
          <>
            <span className="nav-user">Hi, {user.name.split(" ")[0]}</span>
            <button className="btn btn-ghost" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link className="btn btn-ghost" to="/login">
              Log in
            </Link>
            <Link className="btn btn-primary" to="/register">
              Sign up
            </Link>
          </>
        )}
      </div>

      <button
        className={`nav-burger ${menuOpen ? "open" : ""}`}
        aria-label="Menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>

      {menuOpen && (
        <div className="nav-mobile-menu">
          <Link to="/find" onClick={closeMenu}>Find parking</Link>
          {user && <Link to="/bookings" onClick={closeMenu}>My bookings</Link>}
          {user && <Link to="/vehicles" onClick={closeMenu}>My vehicles</Link>}
          {user && <Link to="/list-space" onClick={closeMenu}>List your space</Link>}
          {user && <Link to="/scan" onClick={closeMenu}>Scan check-in</Link>}
          {user?.isAdmin && <Link to="/admin" onClick={closeMenu}>Admin</Link>}

          <div className="nav-mobile-auth">
            {user ? (
              <>
                <span className="nav-user">Hi, {user.name.split(" ")[0]}</span>
                <button className="btn btn-ghost btn-block" onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link className="btn btn-ghost btn-block" to="/login" onClick={closeMenu}>
                  Log in
                </Link>
                <Link className="btn btn-primary btn-block" to="/register" onClick={closeMenu}>
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
