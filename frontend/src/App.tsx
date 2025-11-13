import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from 'react-query';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TenantList from './pages/TenantList';
import TenantDetail from './pages/TenantDetail';
import ParticipantList from './pages/ParticipantList';
import ParticipantDetail from './pages/ParticipantDetail';
import FunnelAnalytics from './pages/FunnelAnalytics';
import CostReporting from './pages/CostReporting';
import Login from './pages/Login';
import { useAuthStore } from './store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2'
    },
    secondary: {
      main: '#dc004e'
    },
    background: {
      default: '#f5f5f5'
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
  }
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="tenants" element={<TenantList />} />
              <Route path="tenants/:id" element={<TenantDetail />} />
              <Route path="participants" element={<ParticipantList />} />
              <Route path="participants/:id" element={<ParticipantDetail />} />
              <Route path="funnel" element={<FunnelAnalytics />} />
              <Route path="cost" element={<CostReporting />} />
            </Route>
          </Routes>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
