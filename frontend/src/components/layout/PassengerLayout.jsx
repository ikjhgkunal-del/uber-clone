import { createContext, useContext, useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  UserRound,
  MapPin,
  SlidersHorizontal,
  ShieldCheck,
  LogOut,
  LoaderCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getProfile, getPlaces, getPreferences } from "../../services/user.api";
import Notice from "../common/Notice";
import "../../styles/account.css";
const PassengerContext = createContext(null);
export const usePassenger = () => useContext(PassengerContext);
const items = [
  ["/passenger", LayoutDashboard, "Overview"],
  ["/passenger/profile", UserRound, "Personal details"],
  ["/passenger/places", MapPin, "Saved places"],
  ["/passenger/preferences", SlidersHorizontal, "Ride preferences"],
  ["/passenger/security", ShieldCheck, "Sign-in & security"],
];
export default function PassengerLayout() {
  const { session, logout } = useAuth();
  const [profile, setProfile] = useState(null),
    [places, setPlaces] = useState([]),
    [preferences, setPreferences] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [leaving, setLeaving] = useState(false);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [p, l, s] = await Promise.all([
        getProfile(),
        getPlaces(),
        getPreferences(),
      ]);
      setProfile(p.profile);
      setPlaces(l.places);
      setPreferences(s.preferences);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let mounted = true;
    Promise.all([getProfile(), getPlaces(), getPreferences()])
      .then(([p, l, s]) => {
        if (mounted) {
          setProfile(p.profile);
          setPlaces(l.places);
          setPreferences(s.preferences);
        }
      })
      .catch((e) => {
        if (mounted) setError(e.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  async function signOut() {
    setLeaving(true);
    try {
      await logout();
    } catch (e) {
      setError(e.message);
      setLeaving(false);
    }
  }
  return (
    <div className="workspace">
      <aside className="workspace-sidebar">
        <div className="workspace-identity">
          <div className="workspace-avatar">
            <UserRound size={25} />
          </div>
          <div>
            <strong>
              {profile?.name || session.user.name || "Your account"}
            </strong>
            <span>Passenger account</span>
          </div>
        </div>
        <nav className="workspace-nav" aria-label="Passenger account">
          {items.map(([to, Icon, label]) => (
            <NavLink key={to} end={to === "/passenger"} to={to}>
              <Icon size={20} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button
          className="workspace-signout"
          onClick={signOut}
          disabled={leaving}
        >
          <LogOut size={18} />
          {leaving ? "Signing out…" : "Sign out"}
        </button>
      </aside>
      <main className="workspace-content" id="main-content">
        {loading ? (
          <div className="section-loading" role="status">
            <LoaderCircle size={22} className="icon-spin" />
            Loading your profile…
          </div>
        ) : error ? (
          <div className="page-intro">
            <h1>Let’s try that again.</h1>
            <Notice>{error}</Notice>
            <button className="button fit-button" onClick={load}>
              Retry
            </button>
          </div>
        ) : (
          <PassengerContext.Provider
            value={{
              profile,
              setProfile,
              places,
              setPlaces,
              preferences,
              setPreferences,
            }}
          >
            <Outlet />
          </PassengerContext.Provider>
        )}
      </main>
    </div>
  );
}
