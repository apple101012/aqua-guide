import { NavLink, Outlet, Link } from "react-router-dom";

export default function Layout() {
  return (
    <>
      <header id="siteHeader">
        <div className="topbar">
          <nav className="nav">
            <Link to="/" className="logo" aria-label="Aqua Guide home">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
              <span>
                <strong>Aqua Guide</strong>
                <small>Water safety for residents and travelers</small>
              </span>
            </Link>
            <div className="nav-right">
              <div className="nav-links">
                <NavLink to="/">Home</NavLink>
                <NavLink to="/countries">Countries</NavLink>
                <NavLink to="/map">Map</NavLink>
                <NavLink to="/assistant">Assistant</NavLink>
              </div>
            </div>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>

      <footer id="siteFooter">
        <div className="footer-inner">
          <p>
            Aqua Guide provides plain-language water safety guidance using
            public global data and should be used alongside official local
            advisories.
          </p>
          <nav>
            <Link to="/countries">Countries</Link>
            <Link to="/map">Map</Link>
            <Link to="/assistant">Assistant</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
