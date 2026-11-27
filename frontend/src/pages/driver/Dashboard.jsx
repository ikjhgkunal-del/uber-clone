import { Link } from "react-router-dom";
import {
  CarFront,
  ArrowRight,
  UserRound,
  ShieldCheck,
  Navigation,
  CircleCheck,
  Clock3,
} from "lucide-react";
import { useDriver } from "../../components/layout/DriverLayout";
export default function Dashboard() {
  const { profile, vehicles, availability } = useDriver();
  const checks = [
    {
      done: profile.emailVerified,
      title: "Verify your email",
      description: "Keep your sign-in secure.",
      to: "/driver/security",
      Icon: ShieldCheck,
    },
    {
      done: Boolean(
        profile.phone &&
        profile.licenseNumber &&
        profile.licenseExpires >= new Date().toISOString().slice(0, 10),
      ),
      title: "Complete driver details",
      description: "Phone number and simulated license.",
      to: "/driver/profile",
      Icon: UserRound,
    },
    {
      done: vehicles.some((v) => v.isActive),
      title: "Choose your vehicle",
      description: "Add a vehicle for simulated trips.",
      to: "/driver/vehicles",
      Icon: CarFront,
    },
  ];
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">DRIVER HOME</p>
        <h1>Welcome, {profile.name.split(" ")[0]}.</h1>
        <p>Everything you need to get ready for the road.</p>
      </div>
      <section className="welcome-banner">
        <div>
          <span className="banner-kicker">YOUR DRIVER WORKSPACE</span>
          <h2>
            Your time.
            <br />
            Your next move.
          </h2>
          <Link
            className="button light-button fit-button"
            to="/driver/availability"
          >
            {availability.online ? "Manage availability" : "Get ready to drive"}
            <ArrowRight size={18} />
          </Link>
        </div>
        <CarFront className="banner-pin" strokeWidth={1} />
      </section>
      <div className="driver-status-row">
        <span
          className={
            "availability-badge " + (availability.online ? "is-online" : "")
          }
        >
          <span />
          {availability.online ? "Online" : "Offline"}
        </span>
        <span>
          {availability.activeVehicle
            ? availability.activeVehicle.make +
              " " +
              availability.activeVehicle.model
            : "No active vehicle"}
        </span>
        <Link to="/driver/availability">
          <Navigation size={16} />
          Manage
        </Link>
      </div>
      <div className="section-heading">
        <h2>Your setup</h2>
        <span className="muted-caption">
          {checks.filter((c) => c.done).length} of 3 complete
        </span>
      </div>
      <div className="overview-links">
        {checks.map(({ done, title, description, to, Icon }) => (
          <Link key={to} to={to}>
            <span className="tile-icon">
              <Icon size={22} />
            </span>
            <div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
            {done ? (
              <CircleCheck
                size={21}
                className="setup-done"
                aria-label="Complete"
              />
            ) : (
              <ArrowRight size={20} />
            )}
          </Link>
        ))}
      </div>
      <div className="subtle-callout">
        <Clock3 size={24} />
        <div>
          <strong>A safe place to simulate</strong>
          <p>
            Use demo vehicle and license details. This student project does not
            approve real drivers, offer earnings or dispatch real trips.
          </p>
        </div>
      </div>
    </>
  );
}
