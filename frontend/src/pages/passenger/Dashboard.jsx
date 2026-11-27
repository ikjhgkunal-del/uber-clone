import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  MapPin,
  Home,
  Briefcase,
  UserRound,
  SlidersHorizontal,
  ShieldCheck,
} from "lucide-react";
import { usePassenger } from "../../components/layout/PassengerLayout";
export default function Dashboard() {
  const { profile, places } = usePassenger();
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">YOUR UBER ACCOUNT</p>
        <h1>Welcome, {profile.name.split(" ")[0]}.</h1>
        <p>Make every journey feel more like you.</p>
      </div>
      <section className="welcome-banner">
        <div>
          <span className="banner-kicker">READY FOR WHAT’S NEXT</span>
          <h2>
            Your places.
            <br />
            Your preferences.
            <br />
            Your way.
          </h2>
          <Link
            className="button light-button fit-button"
            to="/passenger/places"
          >
            Set up your saved places
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <MapPin className="banner-pin" strokeWidth={1} />
      </section>
      <div className="section-heading">
        <h2>Your shortcuts</h2>
        <Link to="/passenger/places">View all places</Link>
      </div>
      <div className="shortcut-grid">
        {[
          ["home", Home, "Home"],
          ["work", Briefcase, "Work"],
        ].map(([kind, Icon, label]) => {
          const place = places.find((p) => p.kind === kind);
          return (
            <Link to="/passenger/places" className="shortcut-card" key={kind}>
              <Icon size={23} strokeWidth={1.8} />
              <div>
                <strong>{label}</strong>
                <span>{place?.address || "Add " + label.toLowerCase()}</span>
              </div>
              <ArrowUpRight size={17} />
            </Link>
          );
        })}
      </div>
      <div className="section-heading">
        <h2>Make it yours</h2>
      </div>
      <div className="overview-links">
        {[
          [
            "/passenger/profile",
            UserRound,
            "Personal details",
            "Keep your name and contact details up to date.",
          ],
          [
            "/passenger/preferences",
            SlidersHorizontal,
            "Ride preferences",
            "Save the little things that make a ride better.",
          ],
          [
            "/passenger/security",
            ShieldCheck,
            "Sign-in & security",
            profile.emailVerified
              ? "Your email is verified. Review your security settings."
              : "Verify your email and manage your sign-in details.",
          ],
        ].map(([to, Icon, title, text]) => (
          <Link to={to} key={to}>
            <span className="tile-icon">
              <Icon size={22} />
            </span>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
            <ArrowUpRight size={19} />
          </Link>
        ))}
      </div>
    </>
  );
}
