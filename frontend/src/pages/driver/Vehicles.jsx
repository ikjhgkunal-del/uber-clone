import { useState } from "react";
import {
  CarFront,
  Plus,
  Pencil,
  Trash2,
  Check,
  Hash,
  Palette,
  CalendarDays,
  Users,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDriver } from "../../components/layout/DriverLayout";
import {
  saveVehicle,
  removeVehicle,
  activateVehicle,
} from "../../services/driver.api";
import Modal from "../../components/common/Modal";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Notice from "../../components/common/Notice";
const blank = {
  make: "",
  model: "",
  color: "",
  plate: "",
  year: new Date().getFullYear(),
  seats: 4,
};
export default function Vehicles() {
  const { vehicles, availability, refresh } = useDriver();
  const [editor, setEditor] = useState(null),
    [form, setForm] = useState(blank),
    [deleting, setDeleting] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [modalError, setModalError] = useState(""),
    [message, setMessage] = useState("");
  const field = (name) => ({
    value: form[name],
    onChange: (e) => setForm({ ...form, [name]: e.target.value }),
    disabled: busy,
  });
  function edit(v) {
    setForm(v ? { ...v } : blank);
    setEditor(v || {});
    setModalError("");
    setError("");
    setMessage("");
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setModalError("");
    try {
      await saveVehicle(
        {
          make: form.make,
          model: form.model,
          color: form.color,
          plate: form.plate,
          year: Number(form.year),
          seats: Number(form.seats),
          ...(editor.id ? { version: editor.version } : {}),
        },
        editor.id,
      );
      await refresh();
      setEditor(null);
      setMessage("Vehicle saved.");
    } catch (e) {
      setModalError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function activate(v) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await activateVehicle(v.id);
      await refresh();
      setMessage("Active vehicle updated.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setModalError("");
    try {
      await removeVehicle(deleting.id);
      await refresh();
      setDeleting(null);
      setMessage("Vehicle removed.");
    } catch (e) {
      setModalError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-intro page-intro-actions">
        <div>
          <p className="eyebrow">DRIVER ACCOUNT</p>
          <h1>Your vehicles</h1>
          <p>Choose the vehicle you’ll use for simulated trips.</p>
        </div>
        <button
          className="button fit-button"
          disabled={availability.online || vehicles.length >= 3 || busy}
          onClick={() => edit(null)}
        >
          <Plus size={18} />
          Add vehicle
        </button>
      </div>
      {availability.online && (
        <Notice type="info">
          Go <Link to="/driver/availability">offline</Link> before changing
          vehicles.
        </Notice>
      )}
      {error && <Notice>{error}</Notice>}
      {message && <Notice type="success">{message}</Notice>}
      <div className="vehicles-list">
        {vehicles.map((v) => (
          <article className="vehicle-card" key={v.id}>
            <div className="vehicle-card-top">
              <span className="vehicle-illustration">
                <CarFront size={54} strokeWidth={1.3} />
              </span>
              <div className="vehicle-details">
                <h2>
                  {v.make} {v.model}
                </h2>
                <p>
                  {v.color} · {v.year} · {v.seats} passenger seats
                </p>
                <span className="plate-tag">{v.plate}</span>
              </div>
            </div>
            <div className="vehicle-card-bottom">
              {v.isActive ? (
                <span className="active-vehicle">
                  <Check size={16} />
                  Active vehicle
                </span>
              ) : (
                <button
                  className="text-button"
                  disabled={busy || availability.online}
                  onClick={() => activate(v)}
                >
                  Use this vehicle
                  <ArrowRight size={16} />
                </button>
              )}
              <div className="place-actions">
                <button
                  className="icon-button"
                  aria-label={"Edit " + v.make + " " + v.model}
                  disabled={busy || availability.online}
                  onClick={() => edit(v)}
                >
                  <Pencil size={18} />
                </button>
                <button
                  className="icon-button"
                  aria-label={"Remove " + v.make + " " + v.model}
                  disabled={busy || availability.online}
                  onClick={() => {
                    setDeleting(v);
                    setModalError("");
                    setMessage("");
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {vehicles.length === 0 && (
        <div className="empty-state">
          <CarFront size={48} strokeWidth={1.3} />
          <h2>Add your first vehicle</h2>
          <p>
            A few demo details are all you need.
            <br />
            Your first vehicle becomes active automatically.
          </p>
          <button className="button fit-button" onClick={() => edit(null)}>
            <Plus size={18} />
            Add vehicle
          </button>
        </div>
      )}
      <p className="muted-caption">
        {vehicles.length} of 3 vehicles · Plates are unique across driver
        accounts. Use demo details.
      </p>
      <Modal
        open={Boolean(editor)}
        onOpenChange={(v) => {
          if (!v) setEditor(null);
        }}
        title={editor?.id ? "Edit vehicle" : "Add a vehicle"}
        description="Use demo vehicle details for this simulator."
        busy={busy}
      >
        <form onSubmit={save}>
          {modalError && <Notice>{modalError}</Notice>}
          <div className="two-fields">
            <Input
              label="Make"
              icon={CarFront}
              required
              maxLength={40}
              placeholder="Toyota"
              {...field("make")}
            />
            <Input
              label="Model"
              icon={CarFront}
              required
              maxLength={40}
              placeholder="Camry"
              {...field("model")}
            />
          </div>
          <Input
            label="Color"
            icon={Palette}
            required
            maxLength={30}
            placeholder="White"
            {...field("color")}
          />
          <Input
            label="License plate"
            icon={Hash}
            required
            pattern="[A-Za-z0-9 -]{3,16}"
            maxLength={16}
            placeholder="DEMO1234"
            hint="Spaces and dashes are removed when saved."
            {...field("plate")}
          />
          <div className="two-fields">
            <Input
              label="Model year"
              type="number"
              icon={CalendarDays}
              required
              min={1990}
              max={new Date().getFullYear() + 1}
              {...field("year")}
            />
            <Input
              label="Passenger seats"
              type="number"
              icon={Users}
              required
              min={1}
              max={8}
              {...field("seats")}
            />
          </div>
          <div className="dialog-actions">
            <button
              type="button"
              className="button secondary-button"
              disabled={busy}
              onClick={() => setEditor(null)}
            >
              Cancel
            </button>
            <Button busy={busy}>Save vehicle</Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={Boolean(deleting)}
        onOpenChange={(v) => {
          if (!v) setDeleting(null);
        }}
        title="Remove vehicle?"
        description={
          deleting?.isActive
            ? "This is your active vehicle. Select another vehicle before going online again."
            : "You can add this vehicle again later."
        }
        busy={busy}
      >
        {modalError && <Notice>{modalError}</Notice>}
        <div className="dialog-actions">
          <button
            className="button secondary-button"
            disabled={busy}
            onClick={() => setDeleting(null)}
          >
            Keep vehicle
          </button>
          <Button className="danger-button" busy={busy} onClick={remove}>
            Remove vehicle
          </Button>
        </div>
      </Modal>
    </>
  );
}
