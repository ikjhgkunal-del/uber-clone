import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PageLayout from "./components/layout/PageLayout";
import AppRoutes from "./routes/AppRoutes";
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PageLayout>
          <AppRoutes />
        </PageLayout>
      </AuthProvider>
    </BrowserRouter>
  );
}
