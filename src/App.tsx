import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';
import LoadingScreen from '@/components/LoadingScreen';
import Login from '@/components/auth/Login';
import Register from '@/components/Register';
import ForgotPassword from '@/components/ForgotPassword';
import Dashboard from '@/components/Dashboard';
import Claims from '@/components/Claims';
import Manifest from '@/components/Manifest';
import Onboarding from '@/components/Onboarding';
import Analysis from '@/components/Analysis';
import ComplianceRevamped from '@/components/ComplianceRevamped';
import Clients from '@/components/Clients';
import ClientDetail from '@/components/ClientDetail';
import Contacts from '@/components/Contacts';
import Settings from '@/components/SettingsRedesigned';
import KnowledgeCentre from '@/components/KnowledgeCentre';
import C285Guide from '@/components/knowledge/C285Guide';
import Checklist from '@/components/knowledge/Checklist';
import Tutorials from '@/components/knowledge/Tutorials';
import Templates from '@/components/knowledge/Templates';
import HMRCResources from '@/components/knowledge/HMRCResources';
import AssistPanel from '@/components/assist/AssistPanel';
import { ShellLayout } from '@/components/layout/AppShellLayout';
import DocumentTemplates from '@/components/DocumentTemplates';
import DemoModeIndicator from '@/components/DemoModeIndicator';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppContent() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <Dashboard />
              <AssistPanel />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/claims"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <Claims />
              <AssistPanel />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/manifest"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <Manifest />
              <AssistPanel />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analysis"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <Analysis />
              <AssistPanel />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <Onboarding />
              <AssistPanel />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/compliance"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <ComplianceRevamped />
              <AssistPanel />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <Clients />
              <AssistPanel />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients/:id"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <ClientDetail />
              <AssistPanel />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/contacts"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <Contacts />
              <AssistPanel />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <Settings />
              <AssistPanel />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <KnowledgeCentre />
              <AssistPanel />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/templates"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <DocumentTemplates />
              <AssistPanel />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge/guide"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <C285Guide />
              <AssistPanel />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge/checklist"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <Checklist />
              <AssistPanel />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge/tutorials"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <Tutorials />
              <AssistPanel />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge/videos"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <Tutorials />
              <AssistPanel />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge/templates"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <Templates />
              <AssistPanel />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge/hmrc"
        element={
          <ProtectedRoute>
            <ShellLayout>
              <HMRCResources />
              <AssistPanel />
            </ShellLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  if (isLoading) {
    return <LoadingScreen onComplete={() => setIsLoading(false)} />;
  }

  return (
    <SettingsProvider>
      <ThemeController />
      <AuthProvider>
        <DemoModeIndicator />
        <AppContent />
      </AuthProvider>
    </SettingsProvider>
  );
}

function ThemeController() {
  const { settings, isLoaded } = useSettings();

  useEffect(() => {
    if (!isLoaded) return;
    const appRoot = document.getElementById('root');
    appRoot?.setAttribute('data-theme', settings.themeMode);
    document.documentElement.removeAttribute('data-theme');
  }, [isLoaded, settings.themeMode]);

  return null;
}
