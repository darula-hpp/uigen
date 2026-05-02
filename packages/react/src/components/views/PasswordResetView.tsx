import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthConfig, PasswordResetEndpoint } from '@uigen-dev/core';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ThemeToggle } from '../ThemeToggle';
import { useThemeInitializer } from '@/hooks/useThemeInitializer';
import { useToast } from '../Toast';

interface PasswordResetViewProps {
  config: AuthConfig;
  appTitle: string;
}

/**
 * Dedicated password reset page component.
 * Renders a form based on the password reset endpoint's request body schema.
 */
export function PasswordResetView({ config, appTitle }: PasswordResetViewProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const passwordResetEndpoints = config.passwordResetEndpoints ?? [];
  const [selectedEndpoint, setSelectedEndpoint] = useState<PasswordResetEndpoint | null>(
    passwordResetEndpoints[0] ?? null
  );

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize theme on mount (prevents FOUC)
  useThemeInitializer();

  // Redirect if no password reset endpoints configured
  if (passwordResetEndpoints.length === 0) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!selectedEndpoint) {
      setError('No password reset endpoint configured');
      return;
    }

    // Basic validation: check required fields
    const schema = selectedEndpoint.requestBodySchema;
    if (schema?.children) {
      for (const field of schema.children) {
        if (field.required && !formData[field.key]?.trim()) {
          setError(`${field.label} is required`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      // Prepend /api to match the proxy routing convention (same as useApiCall)
      const response = await fetch(`/api${selectedEndpoint.path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showToast('success', 'Check your email for password reset instructions.');
        // Redirect to login after successful password reset request
        navigate('/login', { replace: true });
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || errorData.error || 'Password reset failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const schema = selectedEndpoint?.requestBodySchema;
  const fields = schema?.children ?? [];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Theme toggle in top-right corner */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">{appTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Reset your password
          </p>
        </div>

        {/* Password Reset Form Card */}
        <div className="bg-card border rounded-lg shadow-sm p-6 space-y-6">
          {/* Endpoint selector when multiple password reset endpoints exist */}
          {passwordResetEndpoints.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="reset-endpoint">Reset method</Label>
              <select
                id="reset-endpoint"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={selectedEndpoint?.path ?? ''}
                onChange={e =>
                  setSelectedEndpoint(
                    passwordResetEndpoints.find(ep => ep.path === e.target.value) ?? null
                  )
                }
              >
                {passwordResetEndpoints.map(ep => (
                  <option key={ep.path} value={ep.path}>
                    {ep.description ?? ep.path}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Dynamic form based on schema */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(field => {
              const isEmail = field.key === 'email' || field.format === 'email';
              const isPassword = field.key === 'password' || field.key.includes('password');

              return (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <Input
                    id={field.key}
                    type={isPassword ? 'password' : isEmail ? 'email' : 'text'}
                    placeholder={`Enter your ${field.label.toLowerCase()}`}
                    value={formData[field.key] ?? ''}
                    onChange={e => handleFieldChange(field.key, e.target.value)}
                    required={field.required}
                    autoComplete={isEmail ? 'email' : undefined}
                  />
                  {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                </div>
              );
            })}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending reset link…' : 'Reset Password'}
            </Button>
          </form>

          {/* Link to login */}
          <div className="pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Powered by UIGen
        </p>
      </div>
    </div>
  );
}
