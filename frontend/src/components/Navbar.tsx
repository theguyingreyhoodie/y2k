import { Images, LogOut, Moon, Sun, WandSparkles } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Y2KEDIT home">
      <span className="brand__y2k">Y2K</span>
      <span className="brand__edit">EDIT</span>
    </Link>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="nav">
      <div className="nav__bar">
        <Brand />
        <nav className="nav__links" aria-label="Main">
          {user ? (
            <>
              <NavLink to="/editor" className="nav__link">
                <WandSparkles size={16} aria-hidden="true" />
                <span>Editor</span>
              </NavLink>
              <NavLink to="/gallery" className="nav__link">
                <Images size={16} aria-hidden="true" />
                <span>Gallery</span>
              </NavLink>
            </>
          ) : null}
        </nav>
        <div className="nav__end">
          <button
            type="button"
            className="tool nav__theme"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
          </button>
          {user === undefined ? null : user ? (
            <>
              <span className="nav__user" title={user.email}>
                {user.name}
              </span>
              <button
                type="button"
                className="btn btn--chrome btn--sm"
                onClick={async () => {
                  await logout();
                  navigate("/");
                }}
              >
                <LogOut size={14} aria-hidden="true" />
                <span className="nav__hide-sm">Log out</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav__link nav__link--plain">
                Log in
              </Link>
              <Link to="/register" className="btn btn--sm">
                Sign up free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
