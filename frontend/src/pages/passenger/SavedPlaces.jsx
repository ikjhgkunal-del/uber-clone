import { lazy, Suspense, useState } from "react";
import {
  Home,
  Briefcase,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  MapPinned,
} from "lucide-react";
import { usePassenger } from "../../components/layout/PassengerLayout";
import { createPlace, updatePlace, deletePlace } from "../../services/user.api";
import Modal from "../../components/common/Modal";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Notice from "../../components/common/Notice";
const MapPicker = lazy(() => import("../../components/common/MapPicker"));
const icons = { home: Home, work: Briefcase, other: MapPin };
function Editor({ initial, onClose, onSaved }) {
  const [kind, setKind] = useState(initial?.kind || "other"),
    [label, setLabel] = useState(initial?.label || ""),
    [address, setAddress] = useState(initial?.address || ""),
    [latitude, setLatitude] = useState(initial?.latitude?.toString() || ""),
    [longitude, setLongitude] = useState(initial?.longitude?.toString() || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const value =
    latitude !== "" &&
    longitude !== "" &&
    Math.abs(Number(latitude)) <= 90 &&
    Math.abs(Number(longitude)) <= 180
      ? { latitude: Number(latitude), longitude: Number(longitude) }
      : null;
  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!value) {
      setError("Select a point on the map or enter valid coordinates.");
      return;
    }
    setBusy(true);
    try {
      const body = {
        kind,
        label: label.trim(),
        address: address.trim(),
        ...value,
      };
      const result = await (initial
        ? updatePlace(initial.id, body)
        : createPlace(body));
      onSaved(result.place);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      busy={busy}
      title={initial ? "Edit saved place" : "Add a saved place"}
      description="Save an address and select its pickup point."
    >
      <form onSubmit={submit}>
        <div
          className="category-options"
          role="group"
          aria-label="Place category"
        >
          {Object.entries(icons).map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              aria-pressed={kind === key}
              className={kind === key ? "selected" : ""}
              onClick={() => {
                setKind(key);
                if (key !== "other") setLabel(key === "home" ? "Home" : "Work");
              }}
            >
              <Icon size={18} />
              {key === "other" ? "Other" : key === "home" ? "Home" : "Work"}
            </button>
          ))}
        </div>
        <Input
          label="Place label"
          name="label"
          icon={MapPin}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={60}
          required
          placeholder="e.g. Gym or a friend’s place"
        />
        <Input
          label="Address"
          name="address"
          icon={MapPinned}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          minLength={3}
          maxLength={300}
          required
          placeholder="Street, area and city"
        />
        <Suspense
          fallback={
            <div className="place-map map-placeholder">Loading map…</div>
          }
        >
          <MapPicker
            value={value}
            onChange={(point) => {
              setLatitude(point.latitude.toFixed(6));
              setLongitude(point.longitude.toFixed(6));
            }}
          />
        </Suspense>
        <div className="two-fields">
          <Input
            label="Latitude"
            name="latitude"
            type="number"
            icon={MapPin}
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            step="any"
            min={-90}
            max={90}
            required
          />
          <Input
            label="Longitude"
            name="longitude"
            type="number"
            icon={MapPin}
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            step="any"
            min={-180}
            max={180}
            required
          />
        </div>
        {error && <Notice>{error}</Notice>}
        <div className="dialog-actions">
          <button
            type="button"
            className="button secondary-button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <Button busy={busy}>Save place</Button>
        </div>
      </form>
    </Modal>
  );
}
export default function SavedPlaces() {
  const { places, setPlaces } = usePassenger();
  const [editor, setEditor] = useState(null),
    [removing, setRemoving] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  function saved(place) {
    setPlaces((current) =>
      [...current.filter((p) => p.id !== place.id), place].sort(
        (a, b) =>
          ({ home: 0, work: 1, other: 2 })[a.kind] -
          { home: 0, work: 1, other: 2 }[b.kind],
      ),
    );
    setMessage("Your place has been saved.");
  }
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await deletePlace(removing.id);
      setPlaces((current) => current.filter((p) => p.id !== removing.id));
      setRemoving(null);
      setMessage("Saved place removed.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-intro page-intro-actions">
        <div>
          <p className="eyebrow">YOUR SHORTCUTS</p>
          <h1>Saved places</h1>
          <p>Less typing. More getting there.</p>
        </div>
        <button
          className="button fit-button"
          disabled={places.length >= 20}
          onClick={() => {
            setEditor({});
            setMessage("");
          }}
        >
          <Plus size={19} />
          Add place
        </button>
      </div>
      {message && <Notice type="success">{message}</Notice>}
      {places.length ? (
        <div className="places-list">
          {places.map((place) => {
            const Icon = icons[place.kind];
            return (
              <article className="place-card" key={place.id}>
                <span className="tile-icon">
                  <Icon size={23} />
                </span>
                <div className="place-details">
                  <h2>{place.label}</h2>
                  <p>{place.address}</p>
                  <small>
                    {Number(place.latitude).toFixed(5)},{" "}
                    {Number(place.longitude).toFixed(5)}
                  </small>
                </div>
                <div className="place-actions">
                  <button
                    className="icon-button"
                    aria-label={"Edit " + place.label}
                    onClick={() => setEditor({ place })}
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={"Delete " + place.label}
                    onClick={() => {
                      setRemoving(place);
                      setError("");
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <MapPin size={38} strokeWidth={1.4} />
          <h2>Your favorite places, one tap away.</h2>
          <p>Add home, work or somewhere you go often.</p>
          <button className="button fit-button" onClick={() => setEditor({})}>
            <Plus size={18} />
            Save your first place
          </button>
        </div>
      )}
      <p className="muted-caption">
        {places.length} of 20 places saved. You can save one Home and one Work
        address.
      </p>
      {editor && (
        <Editor
          initial={editor.place}
          onClose={() => setEditor(null)}
          onSaved={saved}
        />
      )}
      <Modal
        open={Boolean(removing)}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        busy={busy}
        title="Remove saved place?"
        description={`Remove ${removing?.label || "this place"} from your shortcuts. You can add it again later.`}
      >
        {error && <Notice>{error}</Notice>}
        <div className="dialog-actions">
          <button
            className="button secondary-button"
            onClick={() => setRemoving(null)}
            disabled={busy}
          >
            Keep place
          </button>
          <Button className="danger-button" busy={busy} onClick={remove}>
            Remove place
          </Button>
        </div>
      </Modal>
    </>
  );
}
