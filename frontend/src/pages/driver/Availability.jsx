import { lazy, Suspense, useEffect, useState } from "react";
import {
  Power,
  MapPin,
  Navigation,
  CarFront,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDriver } from "../../components/layout/DriverLayout";
import {
  setDriverAvailability,
  updateDriverLocation,
} from "../../services/driver.api";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Notice from "../../components/common/Notice";
const MapPicker = lazy(() => import("../../components/common/MapPicker"));
export default function Availability() {
  const { availability, setAvailability, refresh, setPresenceError } =
    useDriver();
  const [latitude, setLatitude] = useState(
      availability.location?.latitude ?? 28.6139,
    ),
    [longitude, setLongitude] = useState(
      availability.location?.longitude ?? 77.209,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const coords =
    Number.isFinite(Number(latitude)) &&
    latitude !== "" &&
    Number.isFinite(Number(longitude)) &&
    longitude !== "" &&
    Math.abs(Number(latitude)) <= 90 &&
    Math.abs(Number(longitude)) <= 180
      ? { latitude: Number(latitude), longitude: Number(longitude) }
      : null;
  const remaining = availability.expiresAt
    ? Math.max(0, Math.ceil((Date.parse(availability.expiresAt) - now) / 1000))
    : 0;
  const online = availability.online && remaining > 0;
  async function run(action, success) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const a = await action();
      setAvailability(a.availability);
      setNow(Date.now());
      setPresenceError("");
      setMessage(success);
    } catch (e) {
      setError(e.message);
      try {
        await refresh();
      } catch {
        /* Keep retry available when a dependency is offline. */
      }
    } finally {
      setBusy(false);
    }
  }
  function point(p) {
    setLatitude(Number(p.latitude.toFixed(6)));
    setLongitude(Number(p.longitude.toFixed(6)));
    setMessage("");
  }
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">DRIVER SIMULATOR</p>
        <h1>Your next move</h1>
        <p>Pick a demo location and manage your availability.</p>
      </div>
      <section
        className={"availability-panel " + (online ? "online-panel" : "")}
      >
        <div>
          <span className={"availability-badge " + (online ? "is-online" : "")}>
            <span />
            {online ? "You’re online" : "You’re offline"}
          </span>
          <h2>{online ? "Ready in the simulator." : "Ready when you are."}</h2>
          <p>
            {online
              ? "This page sends a heartbeat every 20 seconds."
              : "Complete your setup, choose a location and go online."}
          </p>
        </div>
        <button
          className={"button fit-button " + (online ? "secondary-button" : "")}
          disabled={busy || (!online && (!availability.eligible || !coords))}
          onClick={() =>
            run(
              () =>
                setDriverAvailability(
                  online ? { online: false } : { online: true, ...coords },
                ),
              online
                ? "You are now offline."
                : "You are now online in the simulator.",
            )
          }
        >
          <Power size={19} />
          {busy ? "Updating…" : online ? "Go offline" : "Go online"}
        </button>
      </section>
      {error && <Notice>{error}</Notice>}
      {message && <Notice type="success">{message}</Notice>}
      {!availability.eligible && (
        <div className="eligibility-card">
          <h2>
            <ShieldCheck size={19} />
            Finish your setup
          </h2>
          <ul>
            {availability.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <div className="setup-shortcuts">
            <Link to="/driver/profile">
              Driver details
              <ArrowRight size={15} />
            </Link>
            <Link to="/driver/vehicles">
              Vehicles
              <ArrowRight size={15} />
            </Link>
            <Link to="/driver/security">
              Verify email
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      )}
      <div className="section-heading">
        <h2>
          <MapPin size={20} />
          Simulated location
        </h2>
        <button
          className="text-button"
          disabled={busy}
          onClick={() => point({ latitude: 28.6139, longitude: 77.209 })}
        >
          <RefreshCw size={15} />
          Reset demo pin
        </button>
      </div>
      <p className="muted-caption">
        This pin is a demo location in New Delhi. Move it on the map or enter
        coordinates. Your device’s GPS is never requested.
      </p>
      <div className="availability-map">
        <Suspense
          fallback={
            <div className="place-map map-placeholder">Loading map…</div>
          }
        >
          <MapPicker value={coords} onChange={point} />
        </Suspense>
      </div>
      <form
        className="location-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (coords)
            void run(
              () => updateDriverLocation(coords),
              "Simulated location updated.",
            );
        }}
      >
        <div className="two-fields">
          <Input
            label="Latitude"
            type="number"
            icon={Navigation}
            required
            min={-90}
            max={90}
            step="any"
            value={latitude}
            onChange={(e) => {
              setLatitude(e.target.value);
              setMessage("");
            }}
            disabled={busy}
          />
          <Input
            label="Longitude"
            type="number"
            icon={Navigation}
            required
            min={-180}
            max={180}
            step="any"
            value={longitude}
            onChange={(e) => {
              setLongitude(e.target.value);
              setMessage("");
            }}
            disabled={busy}
          />
        </div>
        <Button busy={busy} disabled={!online || !coords}>
          Update simulated location
        </Button>
      </form>
      {availability.activeVehicle && (
        <div className="driver-status-row">
          <CarFront size={22} />
          <span>
            {availability.activeVehicle.make} {availability.activeVehicle.model}{" "}
            · {availability.activeVehicle.plate}
          </span>
        </div>
      )}
      <div className="subtle-callout">
        <Power size={22} />
        <div>
          <strong>Availability updates automatically</strong>
          <p>
            {online
              ? "Last update: " +
                new Date(availability.updatedAt).toLocaleTimeString() +
                ". Online lease expires in " +
                remaining +
                " seconds unless renewed."
              : "Online status lasts 90 seconds without a heartbeat."}{" "}
            Closing the page, losing connection or background tab throttling
            lets it expire. Ride requests and live trip tracking will arrive
            with the Ride and Realtime services.
          </p>
        </div>
      </div>
    </>
  );
}
