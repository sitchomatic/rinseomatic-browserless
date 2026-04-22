import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';
import CommandCenter from '@/pages/CommandCenter';
import Credentials from '@/pages/Credentials';
import Flows from '@/pages/Flows';
import FlowEditor from '@/pages/FlowEditor';
import Telemetry from '@/pages/Telemetry';
import Screenshots from '@/pages/Screenshots';
import ProxyVpn from '@/pages/ProxyVpn';
import AiRepair from '@/pages/AiRepair';
import Settings from '@/pages/Settings';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<CommandCenter />} />
        <Route path="/credentials" element={<Credentials />} />
        <Route path="/flows" element={<Flows />} />
        <Route path="/flows/:id" element={<FlowEditor />} />
        <Route path="/telemetry" element={<Telemetry />} />
        <Route path="/screenshots" element={<Screenshots />} />
        <Route path="/proxy" element={<ProxyVpn />} />
        <Route path="/ai-repair" element={<AiRepair />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster theme="dark" position="bottom-right" />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App