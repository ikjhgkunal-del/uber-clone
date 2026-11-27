import Notice from "../../components/common/Notice";
import {
  ArrowRight,
  ChevronDown,
  CircleCheck,
  CircleAlert,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { changePassword, resendVerification } from "../../services/auth.api";
import { storeSession } from "../../services/api";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
export default function Account() {
  const { session, logout } = useAuth();
  const user = session.user;
  const navigate = useNavigate();
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState(false);
  async function run(action) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function update(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirm")) {
      setError("Your passwords do not match.");
      return;
    }
    await run(async () => {
      await changePassword({
        currentPassword: data.get("currentPassword"),
        password: data.get("password"),
      });
      storeSession(null);
      navigate("/login?reset=1", { replace: true });
    });
  }
  return (
    <section className="account-shell">
      <div className="account-top">
        <span className="eyebrow">
          {user.role === "driver" ? "DRIVER ACCOUNT" : "PASSENGER ACCOUNT"}
        </span>
        <button
          className="text-button"
          disabled={busy}
          onClick={() => run(logout)}
        >
          Log out <LogOut size={16} aria-hidden="true" />
        </button>
      </div>
      <h1>Sign-in &amp; security</h1>
      <p className="intro">You’re signed in. Your next journey starts here.</p>
      <section className="account-card">
        <div className="avatar" aria-hidden="true">
          <UserRound size={28} strokeWidth={1.6} />
        </div>
        <div>
          <h2>{user.name || "Your account"}</h2>
          <p>{user.email}</p>
          <span className={`status ${user.emailVerified ? "verified" : ""}`}>
            {user.emailVerified ? (
              <>
                <CircleCheck size={13} aria-hidden="true" />
                Email verified
              </>
            ) : (
              <>
                <CircleAlert size={13} aria-hidden="true" />
                Email not verified
              </>
            )}
          </span>
        </div>
      </section>
      {!user.emailVerified && (
        <section className="verification-banner">
          <h2>Check your inbox</h2>
          <p>Verify your email to keep your account up to date.</p>
          <button
            className="text-button"
            disabled={busy}
            onClick={() =>
              run(async () => {
                setMessage((await resendVerification()).message);
              })
            }
          >
            Resend verification email{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </section>
      )}
      {error && <Notice>{error}</Notice>}
      {message && <Notice type="success">{message}</Notice>}
      <section className="security-section">
        <h2 className="section-title">
          <ShieldCheck size={21} strokeWidth={1.8} aria-hidden="true" />
          Security
        </h2>
        {user.hasPassword ? (
          <>
            <button
              className="security-row"
              aria-expanded={editing}
              onClick={() => setEditing(!editing)}
            >
              Password
              <ChevronDown
                size={19}
                className={editing ? "chevron expanded" : "chevron"}
                aria-hidden="true"
              />
            </button>
            {editing && (
              <form className="password-form" onSubmit={update}>
                <Input
                  label="Current password"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
                <Input
                  label="New password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                  hint="At least 12 characters."
                />
                <Input
                  label="Confirm new password"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                />
                <Button busy={busy}>Update password</Button>
                <small>
                  Changing your password signs you out on all devices.
                </small>
              </form>
            )}
          </>
        ) : (
          <p>
            You sign in with Google. Manage your Google account’s password
            through Google.
          </p>
        )}
      </section>
      <p className="fine-print">
        Manage your sign-in details and keep your account secure.
      </p>
    </section>
  );
}
