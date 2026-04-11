import { NavLink, Outlet, Link } from "react-router-dom";

function DropletIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="22"
      height="22"
    >
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}

export default function Layout() {
  return (
    <>
      <header id="siteHeader">
        <div className="topbar">
          <nav className="nav">
            <Link to="/" className="logo">
              <div className="logo-icon">
                <DropletIcon />
              </div>
              <div>
                <span className="logo-text">Aqua Guide</span>
                <p className="logo-subtext">Water safety for residents and travelers</p>
              </div>
            </Link>
            <div className="nav-right">
              <ul className="nav-links">
                <li><NavLink to="/" end className={({ isActive }) => isActive ? "is-active" : ""}>Home</NavLink></li>
                <li><NavLink to="/countries" className={({ isActive }) => isActive ? "is-active" : ""}>Countries</NavLink></li>
                <li><NavLink to="/map" className={({ isActive }) => isActive ? "is-active" : ""}>Map</NavLink></li>
                <li><NavLink to="/assistant" className={({ isActive }) => isActive ? "is-active" : ""}>Assistant</NavLink></li>
              </ul>
            </div>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>

      <footer id="siteFooter">
        <div className="footer-inner">
          <p>Aqua Guide provides plain-language water safety guidance using public global data and should be used alongside official local advisories.</p>
          <div className="footer-links">
            <Link to="/countries">Countries</Link>
            <Link to="/map">Map</Link>
            <Link to="/assistant">Assistant</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
