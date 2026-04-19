import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { SignUpView } from './components/views/SignUpView';
import { PasswordResetView } from './components/views/PasswordResetView';
import { ToastProvider } from './components/Toast';
import { AppProvider } from './contexts/AppContext';
import { isAuthenticated } from './lib/auth';
import { registerDefaultStrategies } from './lib/file-upload';
import type { UIGenApp } from '@uigen-dev/core';

// Register default file upload strategies on module load
registerDefaultStrategies();

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

// Protected route wrapper - checks auth and wraps with layout
function ProtectedRoute({ 
  config,
  requiresAuth,
  children
}: { 
  config: UIGenApp;
  requiresAuth: boolean;
  children: React.ReactNode;
}) {
  const location = useLocation();
  
  if (requiresAuth && !isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  
  return (
    <Layout config={config}>
      {children}
    </Layout>
  );
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

  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  
  return <LoginView config={config.auth} appTitle={config.meta.title} />;
}

// Sign-up route wrapper - redirects to dashboard if already authenticated
function SignUpRoute({ config }: { config: UIGenApp }) {
  const hasSignUp = (config.auth.signUpEndpoints?.length ?? 0) > 0;

  // No sign-up endpoints configured — redirect to login
  if (!hasSignUp) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  
  return <SignUpView config={config.auth} appTitle={config.meta.title} />;
}

// Password reset route wrapper - redirects to dashboard if already authenticated
function PasswordResetRoute({ config }: { config: UIGenApp }) {
  const hasPasswordReset = (config.auth.passwordResetEndpoints?.length ?? 0) > 0;

  // No password reset endpoints configured — redirect to login
  if (!hasPasswordReset) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  
  return <PasswordResetView config={config.auth} appTitle={config.meta.title} />;
}

export function App({ config }: AppProps) {
  const requiresAuth =
    config.auth.schemes.length > 0 ||
    (config.auth.loginEndpoints?.length ?? 0) > 0;

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider config={config}>
        <ToastProvider>
          <BrowserRouter>
          <Routes>
            {/* Public routes - no protection */}
            <Route path="/login" element={<LoginRoute config={config} />} />
            <Route path="/signup" element={<SignUpRoute config={config} />} />
            <Route path="/password-reset" element={<PasswordResetRoute config={config} />} />
            
            {/* Dashboard - protected with layout */}
            <Route path="/" element={
              <ProtectedRoute config={config} requiresAuth={requiresAuth}>
                <DashboardView config={config} />
              </ProtectedRoute>
            } />
            
            {/* Resource routes - each protected with layout */}
            {config.resources
              .filter(resource => 
                resource.slug !== 'login' && 
                resource.slug !== 'signup' && 
                resource.slug !== 'password-reset'
              ) // Reserved for auth pages
              .map(resource => {
                // Check if resource has a list or search operation
                const hasListOp = resource.operations.some(op => op.viewHint === 'list' || op.viewHint === 'search');
                const createOps = resource.operations.filter(op => op.viewHint === 'create');
                const wizardOps = resource.operations.filter(op => op.viewHint === 'wizard');
                const actionOps = resource.operations.filter(op => op.viewHint === 'action');
                
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
                  indexElement = (
                    <ErrorBoundary>
                      <ListView resource={resource} />
                    </ErrorBoundary>
                  );
                } else if (createOps.length > 1) {
                  // Multiple create operations - show action selection
                  indexElement = <ActionSelectionView resource={resource} />;
                } else if (createOps.length === 1) {
                  // Single create operation - redirect to form
                  indexElement = <Navigate to={`/${resource.slug}/new`} replace />;
                } else if (actionOps.length > 0) {
                  // Action operations (like file upload) - show action selection
                  indexElement = <ActionSelectionView resource={resource} />;
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
                  createElement = (
                    <ErrorBoundary>
                      <WizardView resource={resource} />
                    </ErrorBoundary>
                  );
                } else {
                  createElement = (
                    <ErrorBoundary>
                      <FormView resource={resource} mode="create" />
                    </ErrorBoundary>
                  );
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
                  editElement = (
                    <ErrorBoundary>
                      <WizardView resource={resource} mode="edit" />
                    </ErrorBoundary>
                  );
                } else {
                  editElement = (
                    <ErrorBoundary>
                      <FormView resource={resource} mode="edit" />
                    </ErrorBoundary>
                  );
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
                  detailElement = (
                    <ErrorBoundary>
                      <DetailView resource={resource} />
                    </ErrorBoundary>
                  );
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
                  searchElement = (
                    <ErrorBoundary>
                      <SearchView resource={resource} />
                    </ErrorBoundary>
                  );
                }

                return (
                  <Route key={resource.slug} path={`/${resource.slug}`}>
                    <Route index element={
                      <ProtectedRoute config={config} requiresAuth={requiresAuth}>
                        {indexElement}
                      </ProtectedRoute>
                    } />
                    <Route path="new" element={
                      <ProtectedRoute config={config} requiresAuth={requiresAuth}>
                        {createElement}
                      </ProtectedRoute>
                    } />
                    <Route path="search" element={
                      <ProtectedRoute config={config} requiresAuth={requiresAuth}>
                        {searchElement}
                      </ProtectedRoute>
                    } />
                    <Route path=":id" element={
                      <ProtectedRoute config={config} requiresAuth={requiresAuth}>
                        {detailElement}
                      </ProtectedRoute>
                    } />
                    <Route path=":id/edit" element={
                      <ProtectedRoute config={config} requiresAuth={requiresAuth}>
                        {editElement}
                      </ProtectedRoute>
                    } />
                  </Route>
                );
              })}
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AppProvider>
    </QueryClientProvider>
  );
}
