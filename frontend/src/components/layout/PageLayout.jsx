import { Link } from "react-router-dom";
import { Route } from "lucide-react";
import { UberLogo } from "../common/BrandLogos";
export default function PageLayout({ children }) {
  return (
    <>
      <header className="header">
        <Link to="/login" className="wordmark" aria-label="Uber Clone home">
          <UberLogo />
        </Link>
        <span className="project-label">
          <Route size={15} strokeWidth={1.8} aria-hidden="true" />
          Ride simulator
        </span>
      </header>
      {children}
      <footer className="footer">
        <span>Independent student project</span>
        <span>© {new Date().getFullYear()} Uber Clone</span>
      </footer>
    </>
  );
}
