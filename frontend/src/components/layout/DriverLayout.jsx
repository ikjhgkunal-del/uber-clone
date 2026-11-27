import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  UserRound,
  CarFront,
  Navigation,
  ShieldCheck,
  LogOut,
  LoaderCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getDriverProfile,
  getVehicles,
  getAvailability,
  driverHeartbeat,
  setDriverAvailability,
} from "../../services/driver.api";
import Notice from "../common/Notice";
import "../../styles/account.css";
import "../../styles/driver.css";
const DriverContext = createContext(null);
export const useDriver = () => useContext(DriverContext);
const items = [
  ["/driver", LayoutDashboard, "Overview"],
  ["/driver/profile", UserRound, "Driver details"],
  ["/driver/vehicles", CarFront, "Vehicles"],
  ["/driver/availability", Navigation, "Availability"],
  ["/driver/security", ShieldCheck, "Sign-in & security"],
];
export default function DriverLayout() {
  const { session, logout } = useAuth();
  const [profile, setProfile] = useState(null),
    [vehicles, setVehicles] = useState([]),
    [availability, setAvailability] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [presenceError, setPresenceError] = useState(""),
    [leaving, setLeaving] = useState(false);
  const alive = useRef(true),
    beating = useRef(false);
  const refresh = useCallback(async () => {
    const [p, v, a] = await Promise.all([
      getDriverProfile(),
      getVehicles(),
      getAvailability(),
    ]);
    if (alive.current) {
      setProfile(p.profile);
      setVehicles(v.vehicles);
      setAvailability(a.availability);
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    refresh()
      .catch((e) => {
        if (alive.current) setError(e.message);
      })
      .finally(() => {
        if (alive.current) setLoading(false);
      });
    return () => {
      alive.current = false;
    };
  }, [refresh]);
  // Heartbeats live above routes so navigating within the driver workspace preserves availability.
  useEffect(() => {
    if (!availability?.online) return;
    let cancelled = false;
    async function beat() {
      if (beating.current) return;
      beating.current = true;
      try {
        const a = await driverHeartbeat();
        if (!cancelled) {
          setAvailability(a.availability);
          setPresenceError("");
        }
      } catch (e) {
        if (!cancelled) {
          setPresenceError(e.message);
          try {
            const a = await getAvailability();
            if (!cancelled) setAvailability(a.availability);
          } catch {
            if (Date.now() > Date.parse(availability.expiresAt))
              setAvailability((a) => ({ ...a, online: false }));
          }
        }
      } finally {
        beating.current = false;
      }
    }
    const timer = setInterval(beat, 20000);
    const resume = () => {
      if (document.visibilityState === "visible") void beat();
    };
    document.addEventListener("visibilitychange", resume);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [availability?.online, availability?.expiresAt]);
  async function retry() {
    setLoading(true);
    setError("");
    try {
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  async function signOut() {
    setLeaving(true);
    try {
      try {
        await setDriverAvailability({ online: false });
      } catch {
        /* An unavailable presence store must never prevent signing out. The lease expires. */
      }
      await logout();
    } catch (e) {
      setPresenceError(e.message);
      setLeaving(false);
    }
  }
  return (
    <div className="workspace">
      <aside className="workspace-sidebar">
        <div className="workspace-identity">
          <div className="workspace-avatar">
            <CarFront size={25} />
          </div>
          <div>
            <strong>
              {profile?.name || session.user.name || "Your account"}
            </strong>
            <span>Driver account</span>
          </div>
        </div>
        <nav className="workspace-nav" aria-label="Driver account">
          {items.map(([to, Icon, label]) => (
            <NavLink key={to} end={to === "/driver"} to={to}>
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
            Loading your driver account…
          </div>
        ) : error ? (
          <div className="page-intro">
            <h1>Let’s try that again.</h1>
            <Notice>{error}</Notice>
            <button className="button fit-button" onClick={retry}>
              Retry
            </button>
          </div>
        ) : (
          <DriverContext.Provider
            value={{
              profile,
              setProfile,
              vehicles,
              setVehicles,
              availability,
              setAvailability,
              refresh,
              presenceError,
              setPresenceError,
            }}
          >
            {presenceError && (
              <Notice>
                {presenceError} Online status expires automatically if updates
                stop.
              </Notice>
            )}
            <Outlet />
          </DriverContext.Provider>
        )}
      </main>
    </div>
  );
}
