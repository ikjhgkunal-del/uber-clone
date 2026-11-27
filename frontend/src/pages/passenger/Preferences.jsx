import { useState } from "react";
import { VolumeX, Snowflake, Accessibility } from "lucide-react";
import { usePassenger } from "../../components/layout/PassengerLayout";
import { savePreferences } from "../../services/user.api";
import Notice from "../../components/common/Notice";
import Button from "../../components/common/Button";
const options = [
  [
    "quietRide",
    VolumeX,
    "A quieter ride",
    "Prefer to keep conversation to a minimum.",
  ],
  [
    "coolTemperature",
    Snowflake,
    "A cooler car",
    "Prefer a cooler cabin temperature.",
  ],
  [
    "assistanceNeeded",
    Accessibility,
    "A little extra help",
    "Prefer assistance getting in and out of the vehicle.",
  ],
];
export default function Preferences() {
  const { preferences, setPreferences } = usePassenger();
  const [values, setValues] = useState(preferences),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const dirty = options.some(([key]) => values[key] !== preferences[key]);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const result = await savePreferences(values);
      setPreferences(result.preferences);
      setValues(result.preferences);
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
        <p className="eyebrow">MAKE IT YOURS</p>
        <h1>Ride preferences</h1>
        <p>Save the small things that make you more comfortable.</p>
      </div>
      <form onSubmit={submit}>
        <div className="preference-list">
          {options.map(([key, Icon, title, text]) => (
            <label className="preference-row" key={key}>
              <span className="tile-icon">
                <Icon size={22} />
              </span>
              <span>
                <strong>{title}</strong>
                <small>{text}</small>
              </span>
              <input
                type="checkbox"
                className="preference-switch"
                checked={values[key]}
                onChange={(e) => {
                  setValues((v) => ({ ...v, [key]: e.target.checked }));
                  setSaved(false);
                }}
              />
            </label>
          ))}
        </div>
        <p className="muted-caption">
          These preferences are saved to your profile. They are preferences, not
          a guarantee of vehicle accessibility or equipment.
        </p>
        {error && <Notice>{error}</Notice>}
        {saved && (
          <Notice type="success">Your preferences have been saved.</Notice>
        )}
        <div className="form-actions">
          <Button busy={busy} disabled={!dirty}>
            Save preferences
          </Button>
        </div>
      </form>
    </>
  );
}
