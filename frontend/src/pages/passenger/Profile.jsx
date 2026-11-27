import { useEffect, useState } from "react";
import { Mail, Phone, UserRound, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { usePassenger } from "../../components/layout/PassengerLayout";
import { saveProfile } from "../../services/user.api";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Notice from "../../components/common/Notice";
export default function Profile() {
  const { profile, setProfile } = usePassenger();
  const [name, setName] = useState(profile.name),
    [phone, setPhone] = useState(profile.phone),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    setName(profile.name);
    setPhone(profile.phone);
  }, [profile.name, profile.phone]);
  const dirty = name.trim() !== profile.name || phone.trim() !== profile.phone;
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const result = await saveProfile({
        name: name.trim(),
        phone: phone.trim(),
        version: profile.version,
      });
      setProfile((p) => ({ ...p, ...result.profile }));
      setSaved(true);
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
        <h1>Personal details</h1>
        <p>A few details that help us keep things personal.</p>
      </div>
      <div className="profile-summary">
        <span className="profile-monogram">
          {profile.name[0]?.toUpperCase()}
        </span>
        <div>
          <h2>{profile.name}</h2>
          <p>
            Passenger · Joined{" "}
            {new Intl.DateTimeFormat("en", {
              month: "long",
              year: "numeric",
            }).format(new Date(profile.createdAt))}
          </p>
        </div>
      </div>
      <form onSubmit={submit} className="details-form">
        <Input
          label="Full name"
          name="name"
          icon={UserRound}
          autoComplete="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          required
          maxLength={100}
          pattern=".*\S.*"
        />
        <Input
          label="Email address"
          icon={Mail}
          type="email"
          value={profile.email}
          readOnly
          hint="Your email is managed by your sign-in account."
        />
        <Input
          label="Phone number (optional)"
          icon={Phone}
          type="tel"
          name="phone"
          autoComplete="tel"
          placeholder="+919876543210"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setSaved(false);
          }}
          pattern="^$|^\+[1-9][0-9]{7,14}$"
          maxLength={16}
          hint="Include the country code, with no spaces. This number is not verified."
        />
        {error && <Notice>{error}</Notice>}
        {saved && <Notice type="success">Your details have been saved.</Notice>}
        <div className="form-actions">
          <Button busy={busy} disabled={!dirty}>
            Save changes
          </Button>
        </div>
      </form>
      <div className="subtle-callout">
        <ShieldCheck size={22} />
        <div>
          <strong>Keep your account protected</strong>
          <p>
            Manage your password and email verification in{" "}
            <Link to="/passenger/security">sign-in & security</Link>.
          </p>
        </div>
      </div>
    </>
  );
}
