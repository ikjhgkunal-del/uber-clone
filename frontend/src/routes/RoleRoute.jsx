import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/common/Loader";
export default function RoleRoute({ role }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loader />;
  if (!session)
    return (
      <Navigate
        to="/login"
        state={{ expired: true, from: location.pathname }}
        replace
      />
    );
  if (role && session.user.role !== role)
    return (
      <Navigate
        to={session.user.role === "driver" ? "/driver" : "/passenger"}
        replace
      />
    );
  return <Outlet />;
}
