import { useEffect, useState } from "react";
import {
  Mail,
  Phone,
  UserRound,
  IdCard,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDriver } from "../../components/layout/DriverLayout";
import { saveDriverProfile } from "../../services/driver.api";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Notice from "../../components/common/Notice";
export default function Profile() {
  const { profile, availability, refresh } = useDriver();
  const [form, setForm] = useState({
      name: profile.name,
      phone: profile.phone,
      licenseNumber: profile.licenseNumber,
      licenseExpires: profile.licenseExpires || "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    setForm({
      name: profile.name,
      phone: profile.phone,
      licenseNumber: profile.licenseNumber,
      licenseExpires: profile.licenseExpires || "",
    });
  }, [profile]);
  const field = (name) => ({
    name,
    value: form[name],
    onChange: (e) => {
      setForm({ ...form, [name]: e.target.value });
      setMessage("");
    },
    disabled: busy || availability.online,
  });
  const dirty = Object.entries(form).some(([k, v]) => v !== (profile[k] || ""));
  async function save(e) {
    e.preventDefault();
    const submitted = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await saveDriverProfile({
        ...form,
        ...submitted,
        licenseExpires: submitted.licenseExpires || null,
        version: profile.version,
      });
      await refresh();
      setMessage("Driver details saved.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">ACCOUNT</p>
        <h1>Driver details</h1>
        <p>Keep your details ready for simulated trips.</p>
      </div>
      <div className="profile-summary">
        <div className="profile-monogram">
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2>{profile.name}</h2>
          <p>
            Driver profile ·{" "}
            {profile.emailVerified ? "Email verified" : "Email not verified"}
          </p>
        </div>
      </div>
      {availability.online && (
        <Notice type="info">
          Go <Link to="/driver/availability">offline</Link> to edit your
          details.
        </Notice>
      )}
      <form className="details-form" onSubmit={save}>
        {error && <Notice>{error}</Notice>}
        {message && <Notice type="success">{message}</Notice>}
        <Input
          label="Full name"
          icon={UserRound}
          autoComplete="name"
          required
          maxLength={80}
          {...field("name")}
        />
        <Input
          label="Email address"
          type="email"
          icon={Mail}
          value={profile.email}
          readOnly
          hint="Your email is managed by the sign-in service."
        />
        <Input
          label="Phone number"
          icon={Phone}
          type="tel"
          autoComplete="tel"
          placeholder="+919876543210"
          pattern="\+[1-9][0-9]{7,14}"
          maxLength={16}
          hint="International format. This number is not OTP verified."
          {...field("phone")}
        />
        <div className="form-section-label">SIMULATED LICENSE</div>
        <Input
          label="License number"
          icon={IdCard}
          maxLength={32}
          pattern="[A-Za-z0-9 -]{5,32}"
          hint="Use a demo identifier, such as DEMO12345. Do not upload real documents."
          {...field("licenseNumber")}
        />
        <Input
          label="License expiry date"
          type="date"
          onInput={(e) => {
            const value = e.currentTarget.value;
            setForm((previous) => ({ ...previous, licenseExpires: value }));
          }}
          icon={CalendarDays}
          min="1900-01-01"
          max="2100-12-31"
          {...field("licenseExpires")}
        />
        <div className="form-actions">
          <Button busy={busy} disabled={!dirty || availability.online}>
            Save changes
          </Button>
        </div>
      </form>
      <div className="subtle-callout">
        <ShieldCheck size={24} />
        <div>
          <strong>For this simulator only</strong>
          <p>
            Profile completion is not a real identity or license check. Email
            verification is required before going online.{" "}
            <Link to="/driver/security">Manage account security</Link>.
          </p>
        </div>
      </div>
    </>
  );
}
