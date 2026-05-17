import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { reconcile } from './overrides';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LayoutContainer } from './components/layout/LayoutContainer';
import { ListView } from './components/views/ListView';
import { DetailView } from './components/views/DetailView';
import { FormView } from './components/views/FormView';
import { WizardView } from './components/views/WizardView';
import { SearchView } from './components/views/SearchView';
import { ActionSelectionView } from './components/views/ActionSelectionView';
import { DashboardView } from './components/views/DashboardView';
import { LandingPageView } from './components/views/LandingPageView';
import { LoginView } from './components/views/LoginView';
import { SignUpView } from './components/views/SignUpView';
import { PasswordResetView } from './components/views/PasswordResetView';
import { ProfileView } from './components/views/ProfileView';
import { PricingView } from './components/views/PricingView';
import { OAuthCallback } from './components/auth/OAuthCallback';
import { ToastProvider } from './components/Toast';
import { AppProvider } from './contexts/AppContext';
import { isAuthenticated } from './lib/auth';
import { registerDefaultStrategies } from './lib/file-upload';
import { registerLayoutStrategies } from './lib/layout-strategies';
import type { UIGenApp, LayoutConfig } from '@uigen-dev/core';

// Register default file upload strategies on module load
registerDefaultStrategies();

// Register layout strategies on module load
registerLayoutStrategies();

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
  layoutOverride,
  children
}: { 
  config: UIGenApp;
  requiresAuth: boolean;
  layoutOverride?: LayoutConfig;
  children: React.ReactNode;
}) {
  const location = useLocation();
  
  if (requiresAuth && !isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  
  // Use layoutOverride if provided, otherwise use global layoutConfig
  const layoutConfig = layoutOverride || config.layoutConfig;
  
  return (
    <LayoutContainer layoutConfig={layoutConfig}>
      {children}
    </LayoutContainer>
  );
}

// Login route wrapper - redirects to dashboard if already authenticated
function LoginRoute({ config, landingPageEnabled }: { config: UIGenApp; landingPageEnabled: boolean }) {
  const hasAnyAuth =
    config.auth.schemes.length > 0 ||
    (config.auth.loginEndpoints?.length ?? 0) > 0;

  // No auth configured — skip login entirely
  if (!hasAnyAuth) {
    return <Navigate to="/" replace />;
  }

  if (isAuthenticated()) {
    // Redirect to dashboard if landing page is enabled, otherwise to root
    const redirectPath = landingPageEnabled ? '/dashboard' : '/';
    return <Navigate to={redirectPath} replace />;
  }
  
  // Use centered layout for login page without header
  const centeredLayout: LayoutConfig = { 
    type: 'centered',
    metadata: {
      showHeader: false,
      verticalCenter: true
    }
  };
  
  const appName = config.appConfig?.name || config.meta.title;
  const appIcon = config.appConfig?.icon;
  
  return (
    <LayoutContainer layoutConfig={centeredLayout}>
      <LoginView 
        config={config.auth} 
        appTitle={appName}
        appIcon={appIcon}
        landingPageEnabled={landingPageEnabled}
      />
    </LayoutContainer>
  );
}

// Sign-up route wrapper - redirects to dashboard if already authenticated
function SignUpRoute({ config, landingPageEnabled }: { config: UIGenApp; landingPageEnabled: boolean }) {
  const hasSignUp = (config.auth.signUpEndpoints?.length ?? 0) > 0;

  // No sign-up endpoints configured — redirect to login
  if (!hasSignUp) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated()) {
    // Redirect to dashboard if landing page is enabled, otherwise to root
    const redirectPath = landingPageEnabled ? '/dashboard' : '/';
    return <Navigate to={redirectPath} replace />;
  }
  
  // Use centered layout for signup page without header
  const centeredLayout: LayoutConfig = { 
    type: 'centered',
    metadata: {
      showHeader: false,
      verticalCenter: true
    }
  };
  
  const appName = config.appConfig?.name || config.meta.title;
  const appIcon = config.appConfig?.icon;
  
  return (
    <LayoutContainer layoutConfig={centeredLayout}>
      <SignUpView 
        config={config.auth} 
        appTitle={appName}
        appIcon={appIcon}
      />
    </LayoutContainer>
  );
}

// Password reset route wrapper - redirects to dashboard if already authenticated
function PasswordResetRoute({ config, landingPageEnabled }: { config: UIGenApp; landingPageEnabled: boolean }) {
  const hasPasswordReset = (config.auth.passwordResetEndpoints?.length ?? 0) > 0;

  // No password reset endpoints configured — redirect to login
  if (!hasPasswordReset) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated()) {
    // Redirect to dashboard if landing page is enabled, otherwise to root
    const redirectPath = landingPageEnabled ? '/dashboard' : '/';
    return <Navigate to={redirectPath} replace />;
  }
  
  // Use centered layout for password reset page without header
  const centeredLayout: LayoutConfig = { 
    type: 'centered',
    metadata: {
      showHeader: false,
      verticalCenter: true
    }
  };
  
  const appName = config.appConfig?.name || config.meta.title;
  const appIcon = config.appConfig?.icon;
  
  return (
    <LayoutContainer layoutConfig={centeredLayout}>
      <PasswordResetView 
        config={config.auth} 
        appTitle={appName}
        appIcon={appIcon}
      />
    </LayoutContainer>
  );
}

// Landing page route wrapper - redirects to dashboard if already authenticated
function LandingPageRoute({ config }: { config: UIGenApp }) {
  if (isAuthenticated()) {
    // Redirect authenticated users to dashboard
    return <Navigate to="/dashboard" replace />;
  }
  
  return <LandingPageView config={config} />;
}

export function App({ config }: AppProps) {
  const requiresAuth =
    config.auth.schemes.length > 0 ||
    (config.auth.loginEndpoints?.length ?? 0) > 0;

  // Check if landing page is enabled
  const landingPageEnabled = config.landingPageConfig?.enabled === true;
  
  // Determine dashboard path based on landing page config
  const dashboardPath = landingPageEnabled ? '/dashboard' : '/';

  // Set document title from appConfig.name or fallback to meta.title
  useEffect(() => {
    const appName = config.appConfig?.name || config.meta.title;
    document.title = appName;
  }, [config.appConfig?.name, config.meta.title]);

  // Set favicon from appConfig.icon
  useEffect(() => {
    if (config.appConfig?.icon) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = config.appConfig.icon;
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = config.appConfig.icon;
        document.head.appendChild(newLink);
      }
    }
  }, [config.appConfig?.icon]);

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider config={config}>
        <ToastProvider>
          <BrowserRouter>
          <Routes>
            {/* Public routes - no protection */}
            <Route path="/login" element={<LoginRoute config={config} landingPageEnabled={landingPageEnabled} />} />
            <Route path="/signup" element={<SignUpRoute config={config} landingPageEnabled={landingPageEnabled} />} />
            <Route path="/password-reset" element={<PasswordResetRoute config={config} landingPageEnabled={landingPageEnabled} />} />
            
            {/* OAuth callback route - handles OAuth provider redirects */}
            <Route path="/auth/callback" element={<OAuthCallback config={config} />} />
            
            {/* Landing page route (if enabled) - redirects authenticated users to dashboard */}
            {landingPageEnabled && (
              <Route path="/" element={<LandingPageRoute config={config} />} />
            )}
            
            {/* Dashboard - protected with layout */}
            <Route path={dashboardPath} element={
              <ProtectedRoute config={config} requiresAuth={requiresAuth}>
                <DashboardView config={config} />
              </ProtectedRoute>
            } />
            
            {/* Profile route - protected with layout */}
            <Route path="/profile" element={
              <ProtectedRoute config={config} requiresAuth={requiresAuth}>
                <ProfileView config={config} />
              </ProtectedRoute>
            } />
            
            {/* Pricing route - public, uses centered layout with wider maxWidth */}
            {config.payments?.pricingPage?.enabled && (
              <Route path="/pricing" element={
                <ProtectedRoute 
                  config={config} 
                  requiresAuth={false}
                  layoutOverride={{ 
                    type: 'centered',
                    metadata: {
                      showHeader: true,
                      verticalCenter: false,
                      maxWidth: 1280
                    }
                  }}
                >
                  <PricingView config={config} />
                </ProtectedRoute>
              } />
            )}
            
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
                
                // Find operations for override reconciliation
                const listOp = resource.operations.find(op => op.viewHint === 'list');
                const detailOp = resource.operations.find(op => op.viewHint === 'detail');
                const createOp = resource.operations.find(op => op.viewHint === 'create');
                const updateOp = resource.operations.find(op => op.viewHint === 'update');
                const searchOp = resource.operations.find(op => op.viewHint === 'search');
                
                // Reconcile overrides for each view using operation or resource override config
                const listReconcile = reconcile(listOp?.override || resource.override);
                const detailReconcile = reconcile(detailOp?.override || resource.override);
                const createReconcile = reconcile(createOp?.override || resource.override);
                const editReconcile = reconcile(updateOp?.override || resource.override);
                const searchReconcile = reconcile(searchOp?.override || resource.override);
                
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
                      <ProtectedRoute config={config} requiresAuth={requiresAuth} layoutOverride={resource.layoutOverride}>
                        {indexElement}
                      </ProtectedRoute>
                    } />
                    <Route path="new" element={
                      <ProtectedRoute config={config} requiresAuth={requiresAuth} layoutOverride={resource.layoutOverride}>
                        {createElement}
                      </ProtectedRoute>
                    } />
                    <Route path="search" element={
                      <ProtectedRoute config={config} requiresAuth={requiresAuth} layoutOverride={resource.layoutOverride}>
                        {searchElement}
                      </ProtectedRoute>
                    } />
                    <Route path=":id" element={
                      <ProtectedRoute config={config} requiresAuth={requiresAuth} layoutOverride={resource.layoutOverride}>
                        {detailElement}
                      </ProtectedRoute>
                    } />
                    <Route path=":id/edit" element={
                      <ProtectedRoute config={config} requiresAuth={requiresAuth} layoutOverride={resource.layoutOverride}>
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
