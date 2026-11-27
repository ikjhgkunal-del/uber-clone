import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <h1>We couldn’t find that page.</h1>
        <p className="intro">Let’s get you back on track.</p>
        <Link className="button" to="/login">
          Go to log in <ArrowRight size={20} aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
