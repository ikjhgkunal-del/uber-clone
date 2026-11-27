import { Navigate, Route, Routes } from "react-router-dom";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import Recovery from "../pages/auth/Recovery";
import Account from "../pages/auth/Account";
import NotFound from "../pages/NotFound";
import RoleRoute from "./RoleRoute";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/common/Loader";
function Callback() {
  const { session, loading } = useAuth();
  if (loading) return <Loader />;
  return (
    <Navigate
      to={
        session
          ? session.user.role === "driver"
            ? "/driver"
            : "/passenger"
          : "/login?error=google"
      }
      replace
    />
  );
}
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/forgot-password"
        element={<Recovery key="forgot" mode="forgot" />}
      />
      <Route
        path="/reset-password"
        element={<Recovery key="reset" mode="reset" />}
      />
      <Route
        path="/verify-email"
        element={<Recovery key="verify" mode="verify" />}
      />
      <Route path="/auth/callback" element={<Callback />} />
      <Route element={<RoleRoute role="customer" />}>
        <Route path="/passenger" element={<Account />} />
      </Route>
      <Route element={<RoleRoute role="driver" />}>
        <Route path="/driver" element={<Account />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
