import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { reconcile } from './overrides';
import { ErrorBoundary } from './components/ErrorBoundary';
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
                
                // Reconcile overrides for each view
                const listReconcile = reconcile(`${resource.uigenId}.list`);
                const detailReconcile = reconcile(`${resource.uigenId}.detail`);
                const createReconcile = reconcile(`${resource.uigenId}.create`);
                const editReconcile = reconcile(`${resource.uigenId}.edit`);
                const searchReconcile = reconcile(`${resource.uigenId}.search`);
                
                // Determine index element based on available operations and overrides
                let indexElement;
                
                // Check for component mode override for list view
                if (listReconcile.mode === 'component' && listReconcile.overrideComponent) {
                  const OverrideView = listReconcile.overrideComponent;
                  indexElement = (
                    <ErrorBoundary>
                      <OverrideView resource={resource} />
                    </ErrorBoundary>
                  );
                } else if (hasListOp) {
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

                // Determine which component to use for 'new' route
                let createElement;
                if (createReconcile.mode === 'component' && createReconcile.overrideComponent) {
                  const OverrideView = createReconcile.overrideComponent;
                  createElement = (
                    <ErrorBoundary>
                      <OverrideView resource={resource} />
                    </ErrorBoundary>
                  );
                } else if (wizardOps.length > 0) {
                  createElement = <WizardView resource={resource} />;
                } else {
                  createElement = <FormView resource={resource} mode="create" />;
                }

                // Determine which component to use for 'edit' route
                let editElement;
                if (editReconcile.mode === 'component' && editReconcile.overrideComponent) {
                  const OverrideView = editReconcile.overrideComponent;
                  editElement = (
                    <ErrorBoundary>
                      <OverrideView resource={resource} />
                    </ErrorBoundary>
                  );
                } else if (wizardOps.length > 0) {
                  editElement = <WizardView resource={resource} mode="edit" />;
                } else {
                  editElement = <FormView resource={resource} mode="edit" />;
                }

                // Determine which component to use for 'detail' route
                let detailElement;
                if (detailReconcile.mode === 'component' && detailReconcile.overrideComponent) {
                  const OverrideView = detailReconcile.overrideComponent;
                  detailElement = (
                    <ErrorBoundary>
                      <OverrideView resource={resource} />
                    </ErrorBoundary>
                  );
                } else {
                  detailElement = <DetailView resource={resource} />;
                }

                // Determine which component to use for 'search' route
                let searchElement;
                if (searchReconcile.mode === 'component' && searchReconcile.overrideComponent) {
                  const OverrideView = searchReconcile.overrideComponent;
                  searchElement = (
                    <ErrorBoundary>
                      <OverrideView resource={resource} />
                    </ErrorBoundary>
                  );
                } else {
                  searchElement = <SearchView resource={resource} />;
                }

                return (
                  <Route key={resource.slug} path={`/${resource.slug}`}>
                    <Route index element={indexElement} />
                    <Route path="new" element={createElement} />
                    <Route path="search" element={searchElement} />
                    <Route path=":id" element={detailElement} />
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
