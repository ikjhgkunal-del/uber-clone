import Notice from "../../components/common/Notice";
import { ArrowLeft, CarFront, MapPin } from "lucide-react";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { signUp } from "../../services/auth.api";
import { GoogleButton } from "./Login";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
export default function Register() {
  const { session, loading, setSession } = useAuth();
  const [role, setRole] = useState("customer"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (loading) return <Loader />;
  if (session)
    return (
      <Navigate
        to={session.user.role === "driver" ? "/driver" : "/passenger"}
        replace
      />
    );
  async function submit(event) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirm")) {
      setError("Your passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      setSession(
        await signUp({
          name: data.get("name").trim(),
          email: data.get("email").trim(),
          password: data.get("password"),
          role,
        }),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <Link to="/login" className="back" aria-label="Back to login">
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <h1>Create your account</h1>
        <p className="intro">One account. Wherever you want to go.</p>
        <fieldset className="role-choice">
          <legend>I want to</legend>
          {[
            ["customer", "Ride", "Request a ride"],
            ["driver", "Drive", "Get in the driver’s seat"],
          ].map(([value, title, description]) => (
            <label key={value} className={role === value ? "selected" : ""}>
              <input
                type="radio"
                name="account-role"
                value={value}
                checked={role === value}
                onChange={() => setRole(value)}
              />
              <span className="role-icon" aria-hidden="true">
                {value === "customer" ? (
                  <MapPin size={30} strokeWidth={1.7} />
                ) : (
                  <CarFront size={30} strokeWidth={1.7} />
                )}
              </span>
              <strong>{title}</strong>
              <small>{description}</small>
            </label>
          ))}
        </fieldset>
        <form onSubmit={submit}>
          <Input
            label="Full name"
            name="name"
            placeholder="Enter your name"
            autoComplete="name"
            required
            maxLength={100}
            pattern=".*\S.*"
          />
          <Input
            label="Email address"
            name="email"
            type="email"
            placeholder="Enter email address"
            autoComplete="email"
            required
            maxLength={254}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Create a password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            hint="Use at least 12 characters. A longer passphrase works well."
          />
          <Input
            label="Confirm password"
            name="confirm"
            type="password"
            placeholder="Enter password again"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
          />
          {error && <Notice>{error}</Notice>}
          <Button type="submit" busy={busy}>
            Create account
          </Button>
        </form>
        <GoogleButton role={role} />
        <p className="switch-copy">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
        <p className="fine-print">
          Your role determines the features you can access. This independent
          project does not provide real rides or payments.
        </p>
      </section>
    </main>
  );
}
