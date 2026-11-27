import Notice from "../../components/common/Notice";
import { ArrowLeft } from "lucide-react";
import { GoogleLogo } from "../../components/common/BrandLogos";
import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { signIn } from "../../services/auth.api";
import { api } from "../../services/api";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Loader from "../../components/common/Loader";
export function GoogleButton({ role = "customer" }) {
  const [enabled, setEnabled] = useState(null);
  useEffect(() => {
    api("/auth/config", {}, false)
      .then((config) => setEnabled(config.googleEnabled))
      .catch(() => setEnabled(false));
  }, []);
  return (
    <>
      <div className="divider">
        <span>or</span>
      </div>
      <a
        className={`button google ${enabled ? "" : "unavailable"}`}
        href={enabled ? `/api/auth/google/start?role=${role}` : undefined}
        aria-disabled={!enabled}
        onClick={(event) => {
          if (!enabled) event.preventDefault();
        }}
      >
        <GoogleLogo />
        Continue with Google
      </a>
      {enabled === false && (
        <small className="provider-note">
          Google sign-in is currently unavailable. You can continue with email.
        </small>
      )}
    </>
  );
}
export default function Login() {
  const { session, loading, setSession } = useAuth();
  const [params] = useSearchParams();
  const [step, setStep] = useState(0),
    [email, setEmail] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
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
    if (step === 0) {
      setStep(1);
      return;
    }
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      setSession(
        await signIn({
          email,
          password: data.get("password"),
          remember: data.get("remember") === "on",
        }),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const googleError = params.get("error");
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        {step === 1 && (
          <button
            className="back"
            aria-label="Back to email"
            onClick={() => {
              setStep(0);
              setError("");
            }}
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
        )}
        <h1>{step === 0 ? "What's your email?" : "Enter your password"}</h1>
        <p className="intro">
          {step === 0 ? (
            "Log in to ride, or get in the driver’s seat."
          ) : (
            <>
              Signing in as <strong>{email}</strong>
            </>
          )}
        </p>
        {params.has("reset") && (
          <Notice type="success">
            Password updated. Sign in with your new password.
          </Notice>
        )}
        {googleError && (
          <Notice>
            {googleError === "existing-account"
              ? "This email already has an account. Sign in with your password to keep your account secure."
              : "Google sign-in was cancelled or could not be completed. Please try again."}
          </Notice>
        )}
        <form key={step} onSubmit={submit}>
          {step === 0 ? (
            <Input
              label="Email address"
              name="email"
              type="email"
              placeholder="Enter email address"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          ) : (
            <>
              <input
                type="hidden"
                autoComplete="username"
                value={email}
                readOnly
              />
              <Input
                label="Password"
                name="password"
                type="password"
                placeholder="Enter password"
                autoComplete="current-password"
                required
                maxLength={128}
                autoFocus
              />
              <div className="form-row">
                <label className="check">
                  <input type="checkbox" name="remember" />
                  Remember me
                </label>
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
            </>
          )}
          {error && <Notice>{error}</Notice>}
          <Button busy={busy} type="submit">
            {step === 0 ? "Continue" : "Log in"}
          </Button>
        </form>
        {step === 0 && <GoogleButton />}
        <p className="switch-copy">
          New to Uber? <Link to="/register">Create an account</Link>
        </p>
        <p className="fine-print">
          Use your Uber Clone account to access this ride simulator. Never enter
          credentials from your real Uber account.
        </p>
      </section>
    </main>
  );
}
