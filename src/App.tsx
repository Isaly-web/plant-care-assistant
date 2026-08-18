import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { FullPageSpinner } from "@/components/ui/spinner";
import LoginPage from "@/pages/LoginPage";
import TodayPage from "@/pages/TodayPage";
import PlantsPage from "@/pages/PlantsPage";
import AddPlantPage from "@/pages/AddPlantPage";
import EditPlantPage from "@/pages/EditPlantPage";
import PlantDetailPage from "@/pages/PlantDetailPage";
import HarvestPage from "@/pages/HarvestPage";
import CalendarPage from "@/pages/CalendarPage";
import SettingsPage from "@/pages/SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/logga-in" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function Routed() {
  const { session, loading } = useAuth();

  if (loading) return <FullPageSpinner />;

  return (
    <Routes>
      <Route path="/logga-in" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <TodayPage />
          </RequireAuth>
        }
      />
      <Route
        path="/vaxter"
        element={
          <RequireAuth>
            <PlantsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/vaxter/ny"
        element={
          <RequireAuth>
            <AddPlantPage />
          </RequireAuth>
        }
      />
      <Route
        path="/vaxter/:id"
        element={
          <RequireAuth>
            <PlantDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/vaxter/:id/redigera"
        element={
          <RequireAuth>
            <EditPlantPage />
          </RequireAuth>
        }
      />
      <Route
        path="/skord"
        element={
          <RequireAuth>
            <HarvestPage />
          </RequireAuth>
        }
      />
      <Route
        path="/kalender"
        element={
          <RequireAuth>
            <CalendarPage />
          </RequireAuth>
        }
      />
      <Route
        path="/installningar"
        element={
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routed />
        </BrowserRouter>
        <Toaster position="top-center" richColors closeButton />
      </AuthProvider>
    </QueryClientProvider>
  );
}
