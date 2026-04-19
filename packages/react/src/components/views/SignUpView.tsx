import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AuthConfig, SignUpEndpoint } from '@uigen-dev/core';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '../Toast';

interface SignUpViewProps {
  config: AuthConfig;
  appTitle: string;
}

/**
 * Dedicated sign-up/registration page component.
 * Renders a form based on the sign-up endpoint's request body schema.
 */
export function SignUpView({ config, appTitle }: SignUpViewProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const signUpEndpoints = config.signUpEndpoints ?? [];
  const [selectedEndpoint, setSelectedEndpoint] = useState<SignUpEndpoint | null>(
    signUpEndpoints[0] ?? null
  );

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if no sign-up endpoints configured
  if (signUpEndpoints.length === 0) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!selectedEndpoint) {
      setError('No sign-up endpoint configured');
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
        showToast('success', 'Your account has been created successfully. Please sign in.');
        // Redirect to login after successful sign-up
        navigate('/login', { replace: true });
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || errorData.error || 'Sign-up failed');
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
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">{appTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your account
          </p>
        </div>

        {/* Sign-up Form Card */}
        <div className="bg-card border rounded-lg shadow-sm p-6 space-y-6">
          {/* Endpoint selector when multiple sign-up endpoints exist */}
          {signUpEndpoints.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="signup-endpoint">Registration method</Label>
              <select
                id="signup-endpoint"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={selectedEndpoint?.path ?? ''}
                onChange={e =>
                  setSelectedEndpoint(
                    signUpEndpoints.find(ep => ep.path === e.target.value) ?? null
                  )
                }
              >
                {signUpEndpoints.map(ep => (
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
                    autoComplete={
                      isEmail ? 'email' : isPassword ? 'new-password' : undefined
                    }
                  />
                  {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                </div>
              );
            })}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account…' : 'Sign Up'}
            </Button>
          </form>

          {/* Link to login */}
          <div className="pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
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
