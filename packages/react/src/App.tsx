import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/layout/Layout';
import { ListView } from './components/views/ListView';
import { DetailView } from './components/views/DetailView';
import { FormView } from './components/views/FormView';
import { WizardView } from './components/views/WizardView';
import { SearchView } from './components/views/SearchView';
import { ActionSelectionView } from './components/views/ActionSelectionView';
import { DashboardView } from './components/views/DashboardView';
import { LoginView } from './components/views/LoginView';
import { ToastProvider } from './components/Toast';
import { isAuthenticated } from './lib/auth';
import type { UIGenApp } from '@uigen-dev/core';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

interface AppProps {
  config: UIGenApp;
}

// Protected route wrapper - redirects to login if not authenticated
function ProtectedRoute({ requiresAuth }: { requiresAuth: boolean }) {
  if (!requiresAuth) return <Outlet />;
  
  const authenticated = isAuthenticated();
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
}

// Login route wrapper - redirects to dashboard if already authenticated
function LoginRoute({ config }: { config: UIGenApp }) {
  const hasAnyAuth =
    config.auth.schemes.length > 0 ||
    (config.auth.loginEndpoints?.length ?? 0) > 0;

  // No auth configured — skip login entirely
  if (!hasAnyAuth) {
    return <Navigate to="/" replace />;
  }

  const authenticated = isAuthenticated();
  if (authenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <LoginView config={config.auth} appTitle={config.meta.title} />;
}

export function App({ config }: AppProps) {
  const requiresAuth =
    config.auth.schemes.length > 0 ||
    (config.auth.loginEndpoints?.length ?? 0) > 0;

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
        <Routes>
          {/* Login route - accessible without authentication */}
          <Route 
            path="/login" 
            element={<LoginRoute config={config} />} 
          />
          
          {/* All other routes require authentication and use Layout */}
          <Route element={<ProtectedRoute requiresAuth={requiresAuth} />}>
            <Route element={<Layout config={config}><Outlet /></Layout>}>
              <Route path="/" element={<DashboardView config={config} />} />
              
              {config.resources.map(resource => {
                // Check if resource has a list or search operation
                const hasListOp = resource.operations.some(op => op.viewHint === 'list' || op.viewHint === 'search');
                const createOps = resource.operations.filter(op => op.viewHint === 'create');
                const wizardOps = resource.operations.filter(op => op.viewHint === 'wizard');
                
                // Determine index element based on available operations
                let indexElement;
                if (hasListOp) {
                  indexElement = <ListView resource={resource} />;
                } else if (createOps.length > 1) {
                  // Multiple create operations - show action selection
                  indexElement = <ActionSelectionView resource={resource} />;
                } else if (createOps.length === 1) {
                  // Single create operation - redirect to form
                  indexElement = <Navigate to={`/${resource.slug}/new`} replace />;
                } else {
                  // No operations available
                  indexElement = (
                    <div className="p-4 text-muted-foreground">
                      No operations available for {resource.name}
                    </div>
                  );
                }

                // Determine which component to use for 'new' and 'edit' routes
                // Use WizardView if wizard operation exists, otherwise use FormView
                const createElement = wizardOps.length > 0 
                  ? <WizardView resource={resource} />
                  : <FormView resource={resource} mode="create" />;

                const editElement = wizardOps.length > 0
                  ? <WizardView resource={resource} mode="edit" />
                  : <FormView resource={resource} mode="edit" />;

                return (
                  <Route key={resource.slug} path={`/${resource.slug}`}>
                    <Route index element={indexElement} />
                    <Route path="new" element={createElement} />
                    <Route path="search" element={<SearchView resource={resource} />} />
                    <Route path=":id" element={<DetailView resource={resource} />} />
                    <Route path=":id/edit" element={editElement} />
                  </Route>
                );
              })}
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
