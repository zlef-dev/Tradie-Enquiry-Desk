import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { PublicPage, EnquiryForm } from "./public";
import { DashboardPage, DetailPage } from "./owner";
import "./styles.css";

function App() {
  const [path, setPath] = useState(location.hash.slice(1) || "/");
  useEffect(() => {
    const change = () => {
      setPath(location.hash.slice(1) || "/");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    document.querySelector<HTMLElement>("main")?.focus();
  }, [path]);
  const owner = path.startsWith("/owner");
  return (
    <>
      <a
        className="skip"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      <div className="concept-bar">
        <span>Rivergum Plumbing — Portfolio Concept</span>
        <span>Fictional business · Real working demo</span>
      </div>
      <header className="site-header">
        <a className="brand" href="#/" aria-label="Rivergum Plumbing home">
          <span className="brand-mark" aria-hidden="true">
            r<span>·</span>
          </span>
          <span>
            rivergum<span className="brand-sub">PLUMBING</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          {owner ? (
            <>
              <a href="#/">
                Public website <span aria-hidden="true">↗</span>
              </a>
              <a className="nav-current" href="#/owner">
                Enquiry desk
              </a>
            </>
          ) : (
            <>
              <a href="#/owner">
                Explore owner demo <span aria-hidden="true">↗</span>
              </a>
              <a className="button small" href="#/enquire">
                Request a quote <span aria-hidden="true">↗</span>
              </a>
            </>
          )}
        </nav>
      </header>
      {path === "/" ? (
        <PublicPage />
      ) : path === "/enquire" ? (
        <EnquiryForm />
      ) : path === "/owner" ? (
        <DashboardPage />
      ) : path.startsWith("/owner/") ? (
        <DetailPage id={path.split("/")[2]} key={path} />
      ) : (
        <main id="main" tabIndex={-1} className="shell">
          <h1>Page not found</h1>
          <a href="#/">Return home</a>
        </main>
      )}
      <footer>
        <a className="footer-brand" href="#/">
          rivergum plumbing
        </a>
        <span>
          A fictional portfolio concept. No appointments, quotes or messages are
          sent.
        </span>
        <span>Made for a little less admin.</span>
      </footer>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
