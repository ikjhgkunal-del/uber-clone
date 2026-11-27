import Notice from "../../components/common/Notice";
import { ArrowLeft, KeyRound, MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  forgotPassword,
  resetPassword,
  verifyEmail,
} from "../../services/auth.api";
import { storeSession } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
export default function Recovery({ mode }) {
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get("token") || "",
  );
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const navigate = useNavigate();
  const { reloadUser, session } = useAuth();
  useEffect(() => {
    if (window.location.hash)
      window.history.replaceState(null, "", window.location.pathname);
  }, []);
  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      if (mode === "forgot")
        setMessage((await forgotPassword(data.get("email"))).message);
      if (mode === "reset") {
        if (data.get("password") !== data.get("confirm"))
          throw new Error("Your passwords do not match.");
        await resetPassword({ token, password: data.get("password") });
        storeSession(null);
        navigate("/login?reset=1", { replace: true });
      }
      if (mode === "verify") {
        setMessage((await verifyEmail(token)).message);
        if (session) await reloadUser();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const titles = {
    forgot: "Forgot your password?",
    reset: "Create a new password",
    verify: "Verify your email",
  };
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <Link to="/login" className="back" aria-label="Back to login">
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <div className="recovery-symbol" aria-hidden="true">
          {mode === "reset" ? (
            <KeyRound size={26} strokeWidth={1.6} />
          ) : (
            <MailCheck size={26} strokeWidth={1.6} />
          )}
        </div>
        <h1>{titles[mode]}</h1>
        <p className="intro">
          {mode === "forgot"
            ? "Enter your email and we’ll send you a link to reset your password."
            : mode === "reset"
              ? "Choose a strong password you haven’t used before."
              : "Confirm your email address to finish setting up your account."}
        </p>
        {message ? (
          <Notice type="success">{message}</Notice>
        ) : (
          <form onSubmit={submit}>
            {mode === "forgot" && (
              <Input
                label="Email address"
                name="email"
                type="email"
                placeholder="Enter email address"
                autoComplete="email"
                required
                maxLength={254}
              />
            )}
            {mode === "reset" && (
              <>
                <Input
                  label="New password"
                  name="password"
                  type="password"
                  placeholder="Create a password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  hint="At least 12 characters."
                />
                <Input
                  label="Confirm new password"
                  name="confirm"
                  type="password"
                  placeholder="Enter password again"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                />
              </>
            )}
            {mode !== "forgot" && !token && (
              <Notice>Open the full link from your email to continue.</Notice>
            )}
            {error && <Notice>{error}</Notice>}
            <Button busy={busy} disabled={mode !== "forgot" && !token}>
              {mode === "forgot"
                ? "Send reset link"
                : mode === "reset"
                  ? "Update password"
                  : "Verify email"}
            </Button>
          </form>
        )}
        <p className="switch-copy">
          <Link to="/login">Back to log in</Link>
        </p>
      </section>
    </main>
  );
}
