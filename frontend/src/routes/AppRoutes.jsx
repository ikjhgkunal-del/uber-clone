import DriverLayout from "../components/layout/DriverLayout";
import DriverDashboard from "../pages/driver/Dashboard";
import DriverProfile from "../pages/driver/Profile";
import Vehicles from "../pages/driver/Vehicles";
import Availability from "../pages/driver/Availability";
import PassengerLayout from "../components/layout/PassengerLayout";
import PassengerDashboard from "../pages/passenger/Dashboard";
import PassengerProfile from "../pages/passenger/Profile";
import SavedPlaces from "../pages/passenger/SavedPlaces";
import Preferences from "../pages/passenger/Preferences";
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
        <Route path="/passenger" element={<PassengerLayout />}>
          <Route index element={<PassengerDashboard />} />
          <Route path="profile" element={<PassengerProfile />} />
          <Route path="places" element={<SavedPlaces />} />
          <Route path="preferences" element={<Preferences />} />
          <Route path="security" element={<Account />} />
        </Route>
      </Route>
      <Route element={<RoleRoute role="driver" />}>
        <Route path="/driver" element={<DriverLayout />}>
          <Route index element={<DriverDashboard />} />
          <Route path="profile" element={<DriverProfile />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="availability" element={<Availability />} />
          <Route path="security" element={<Account />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
