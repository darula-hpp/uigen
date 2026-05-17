import React, { useState, useEffect } from 'react';
import type { OverrideComponentProps } from '@uigen-dev/react';

/**
 * Complete Profile Page Override
 * 
 * This override completely replaces the default profile view with a custom design.
 * Uses theme CSS classes from .uigen/theme.css for consistent styling.
 */

interface User {
  id: number;
  username: string;
  email: string | null;
  created_at: string;
}

interface ProfileData {
  data: User;
  isLoading: boolean;
  error: Error | null;
}

interface UpdateProfileData {
  username?: string;
  email?: string;
}

interface PricingPlan {
  id: string;
  name: string;
  description?: string;
  type: string;
  price: number | string;
  currency?: string;
  interval?: string;
  intervalCount?: number;
  features?: string[];
  highlighted?: boolean;
}

interface ProfileOverrideInternalProps {
  profileData: ProfileData;
  onUpdate: (data: UpdateProfileData) => Promise<void>;
  isUpdating: boolean;
  currentPlan: PricingPlan | null;
  planLoading: boolean;
}

const ProfileOverrideInternal: React.FC<ProfileOverrideInternalProps> = ({ 
  profileData, 
  onUpdate, 
  isUpdating,
  currentPlan,
  planLoading
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: profileData.data?.username || '',
    email: profileData.data?.email || '',
  });
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    try {
      await onUpdate(formData);
      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    setFormData({
      username: profileData.data?.username || '',
      email: profileData.data?.email || '',
    });
    setIsEditing(false);
    setLocalError(null);
  };

  if (profileData.isLoading) {
    return (
      <div className="profile-container">
        <div className="profile-loading">
          <div className="profile-spinner"></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (profileData.error) {
    return (
      <div className="profile-container">
        <div className="profile-error-card">
          <h2>Error Loading Profile</h2>
          <p>{profileData.error.message}</p>
        </div>
      </div>
    );
  }

  const user = profileData.data;
  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="profile-page-wrapper">
      <div className="profile-card bg-card">
        {/* Header Section */}
        <div className="profile-header">
          <div className="profile-avatar-section">
            <div className="profile-avatar">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="profile-header-info">
              <h1>{user.username}</h1>
              <p>Member since {memberSince}</p>
            </div>
          </div>
          {!isEditing && (
            <button 
              className="profile-edit-button"
              onClick={() => setIsEditing(true)}
            >
              ✏️ Edit Profile
            </button>
          )}
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="profile-success-banner">
            ✓ {successMessage}
          </div>
        )}

        {/* Error Message */}
        {localError && (
          <div className="profile-error-banner">
            ✗ {localError}
          </div>
        )}

        {/* Profile Content */}
        {!isEditing ? (
          <div className="profile-info-section">
            <div className="profile-info-row">
              <div className="profile-info-label">User ID</div>
              <div className="profile-info-value">#{user.id}</div>
            </div>
            <div className="profile-info-row">
              <div className="profile-info-label">Username</div>
              <div className="profile-info-value">{user.username}</div>
            </div>
            <div className="profile-info-row">
              <div className="profile-info-label">Email</div>
              <div className="profile-info-value">
                {user.email || <span className="profile-not-set">Not set</span>}
              </div>
            </div>
            <div className="profile-info-row">
              <div className="profile-info-label">Account Created</div>
              <div className="profile-info-value">{memberSince}</div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="profile-form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleInputChange}
                minLength={3}
                maxLength={50}
                required
              />
              <p className="profile-help-text">3-50 characters</p>
            </div>

            <div className="profile-form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your.email@example.com"
              />
              <p className="profile-help-text">Optional</p>
            </div>

            <div className="profile-form-actions">
              <button
                type="button"
                onClick={handleCancel}
                className="profile-cancel-button"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="profile-save-button bg-primary"
                disabled={isUpdating}
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* Footer Stats */}
        <div className="profile-footer">
          <div className="profile-stat">
            <div className="profile-stat-value">Active</div>
            <div className="profile-stat-label">Status</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-value">{user.id}</div>
            <div className="profile-stat-label">User ID</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-value">
              {Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))}
            </div>
            <div className="profile-stat-label">Days Active</div>
          </div>
        </div>
      </div>

      {/* Subscription Plan Card */}
      <div className="subscription-card bg-card">
        {planLoading ? (
          <div className="subscription-loading">
            <div className="profile-spinner"></div>
            <p>Loading subscription...</p>
          </div>
        ) : currentPlan ? (
          <>
            <div className="subscription-header">
              <div>
                <h2>Your Subscription</h2>
                <p>Manage your plan and billing</p>
              </div>
              <div className="subscription-badge">{currentPlan.name}</div>
            </div>

            <div className="subscription-features">
              <h3>What's Included</h3>
              <ul>
                {currentPlan.features && currentPlan.features.length > 0 ? (
                  currentPlan.features.map((feature, index) => (
                    <li key={index}>
                      <span className="feature-icon">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))
                ) : (
                  <li>
                    <span className="feature-icon">✓</span>
                    <span>Basic features included</span>
                  </li>
                )}
              </ul>
            </div>

            <div className="subscription-upgrade">
              <div className="upgrade-content">
                <h3>Want More?</h3>
                <p>Explore our other plans for additional features and benefits.</p>
              </div>
              <a href="/pricing" className="upgrade-button bg-primary">
                View Plans
              </a>
            </div>
          </>
        ) : (
          <div className="subscription-error">
            <p>Unable to load subscription information</p>
            <a href="/pricing" className="upgrade-button bg-primary">
              View Plans
            </a>
          </div>
        )}
      </div>
      
      <style>{`
        .profile-page-wrapper {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 40px 20px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          align-items: stretch;
        }
        
        @media (max-width: 1024px) {
          .profile-page-wrapper {
            grid-template-columns: 1fr;
            gap: 24px;
          }
        }
        
        .profile-card {
          border-radius: var(--radius);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          width: 100%;
          overflow: hidden;
          border: 1px solid var(--border);
          display: flex;
          flex-direction: column;
        }
        
        .profile-header {
          background: var(--primary);
          padding: 32px;
          color: var(--primary-foreground);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .profile-avatar-section {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        
        .profile-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background-color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          font-weight: bold;
          color: var(--accent-foreground);
          border: 4px solid var(--border);
        }
        
        .profile-header-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .profile-header-info h1 {
          margin: 0;
          font-size: 28px;
          font-weight: bold;
          color: var(--primary-foreground);
        }
        
        .profile-header-info p {
          margin: 0;
          font-size: 14px;
          opacity: 0.9;
          color: var(--primary-foreground);
        }
        
        .profile-edit-button {
          background-color: var(--accent);
          color: var(--accent-foreground);
          border: 2px solid var(--border);
          padding: 10px 20px;
          border-radius: 0.25rem;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        
        .profile-edit-button:hover {
          opacity: 0.9;
        }
        
        .profile-success-banner {
          background-color: #10b981;
          color: #ffffff;
          padding: 12px 32px;
          text-align: center;
          font-weight: 500;
        }
        
        .profile-error-banner {
          background-color: var(--destructive);
          color: var(--destructive-foreground);
          padding: 12px 32px;
          text-align: center;
          font-weight: 500;
        }
        
        .profile-info-section {
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .profile-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border);
        }
        
        .profile-info-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--muted-foreground);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .profile-info-value {
          font-size: 16px;
          font-weight: 500;
          color: var(--foreground);
        }
        
        .profile-not-set {
          color: var(--muted-foreground);
          font-style: italic;
        }
        
        .profile-form {
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        .profile-form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .profile-form-group label {
          font-size: 14px;
          font-weight: 600;
          color: var(--foreground);
        }
        
        .profile-form-group input {
          padding: 12px 16px;
          font-size: 16px;
          border: 2px solid var(--border);
          border-radius: 0.25rem;
          transition: border-color 0.3s ease;
          outline: none;
          background-color: var(--background);
          color: var(--foreground);
        }
        
        .profile-form-group input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 1px var(--primary);
        }
        
        .profile-help-text {
          font-size: 12px;
          color: var(--muted-foreground);
          margin: 0;
        }
        
        .profile-form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 8px;
        }
        
        .profile-cancel-button {
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 600;
          border: 2px solid var(--border);
          background-color: var(--background);
          color: var(--muted-foreground);
          border-radius: 0.25rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .profile-cancel-button:hover {
          background-color: var(--muted);
        }
        
        .profile-save-button {
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 600;
          border: none;
          color: var(--primary-foreground);
          border-radius: 0.25rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .profile-save-button:hover {
          opacity: 0.9;
        }
        
        .profile-save-button:disabled,
        .profile-cancel-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .profile-footer {
          background-color: var(--muted);
          padding: 24px 32px;
          display: flex;
          justify-content: space-around;
          border-top: 1px solid var(--border);
        }
        
        .profile-stat {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .profile-stat-value {
          font-size: 24px;
          font-weight: bold;
          color: var(--primary);
        }
        
        .profile-stat-label {
          font-size: 12px;
          color: var(--muted-foreground);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .profile-loading {
          text-align: center;
          padding: 60px;
          background-color: var(--card);
          border-radius: var(--radius);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        .profile-spinner {
          width: 50px;
          height: 50px;
          margin: 0 auto 20px;
          border: 4px solid var(--border);
          border-top: 4px solid var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .profile-loading p {
          color: var(--muted-foreground);
          font-size: 16px;
        }
        
        .profile-error-card {
          background-color: var(--card);
          border-radius: var(--radius);
          padding: 40px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border);
        }
        
        .profile-error-card h2 {
          color: var(--destructive);
          margin-bottom: 16px;
        }
        
        .profile-error-card p {
          color: var(--muted-foreground);
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Subscription Card Styles */
        .subscription-card {
          border-radius: var(--radius);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          width: 100%;
          overflow: hidden;
          border: 1px solid var(--border);
          display: flex;
          flex-direction: column;
        }
        
        .subscription-loading {
          text-align: center;
          padding: 60px 32px;
        }
        
        .subscription-error {
          text-align: center;
          padding: 60px 32px;
        }
        
        .subscription-error p {
          color: var(--muted-foreground);
          margin-bottom: 24px;
          font-size: 16px;
        }
        
        .subscription-header {
          background: linear-gradient(135deg, var(--primary) 0%, #b45309 100%);
          padding: 32px;
          color: var(--primary-foreground);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .subscription-header h2 {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
          color: var(--primary-foreground);
        }
        
        .subscription-header p {
          margin: 4px 0 0 0;
          font-size: 14px;
          opacity: 0.9;
          color: var(--primary-foreground);
        }
        
        .subscription-badge {
          background-color: var(--accent);
          color: var(--accent-foreground);
          padding: 8px 20px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border: 2px solid var(--border);
        }
        
        .subscription-features {
          padding: 32px;
          border-bottom: 1px solid var(--border);
        }
        
        .subscription-features h3 {
          margin: 0 0 20px 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--foreground);
        }
        
        .subscription-features ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .subscription-features li {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 15px;
          color: var(--foreground);
        }
        
        .feature-icon {
          width: 24px;
          height: 24px;
          background-color: var(--primary);
          color: var(--primary-foreground);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: bold;
          flex-shrink: 0;
        }
        
        .subscription-upgrade {
          padding: 32px;
          background-color: var(--muted);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }
        
        .upgrade-content h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 700;
          color: var(--foreground);
        }
        
        .upgrade-content p {
          margin: 0;
          font-size: 14px;
          color: var(--muted-foreground);
          line-height: 1.5;
        }
        
        .upgrade-button {
          padding: 12px 32px;
          font-size: 16px;
          font-weight: 600;
          border: none;
          color: var(--primary-foreground);
          border-radius: 0.25rem;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.3s ease;
          white-space: nowrap;
          display: inline-block;
        }
        
        .upgrade-button:hover {
          opacity: 0.9;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        @media (max-width: 768px) {
          .profile-page-wrapper {
            grid-template-columns: 1fr;
          }
          
          .profile-header {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .profile-edit-button {
            width: 100%;
          }
          
          .profile-form-actions {
            flex-direction: column;
          }
          
          .profile-cancel-button,
          .profile-save-button {
            width: 100%;
          }
          
          .subscription-header {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .subscription-badge {
            align-self: flex-start;
          }
          
          .subscription-upgrade {
            flex-direction: column;
            align-items: stretch;
          }
          
          .upgrade-button {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

// Wrapper component that receives OverrideComponentProps and handles data fetching
const ProfileOverride: React.FC<OverrideComponentProps> = ({ resource }) => {
  const [profileData, setProfileData] = useState<ProfileData>({
    data: null as unknown as User,
    isLoading: true,
    error: null,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PricingPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  // Find GET operation for fetching profile
  const getOperation = resource.operations.find((op: any) => op.method === 'GET');
  
  // Find PUT/PATCH operation for updating profile
  const updateOperation = resource.operations.find(
    (op: any) => op.method === 'PUT' || op.method === 'PATCH'
  );

  // Fetch profile data
  useEffect(() => {
    if (!getOperation) {
      setProfileData({
        data: null as unknown as User,
        isLoading: false,
        error: new Error('No GET operation found for profile'),
      });
      return;
    }

    const fetchProfile = async () => {
      try {
        // Use the same URL construction as useApiCall: /api + operation.path
        const url = `/api${getOperation.path}`;
        
        // Get auth headers from window (same as SPA)
        const authHeaders = (window as any).getAuthHeaders?.() || {};
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.statusText}`);
        }

        const data = await response.json();
        setProfileData({
          data,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setProfileData({
          data: null as unknown as User,
          isLoading: false,
          error: error instanceof Error ? error : new Error('Unknown error'),
        });
      }
    };

    fetchProfile();
  }, [getOperation]);

  // Fetch pricing plans
  useEffect(() => {
    const fetchPricingPlans = async () => {
      try {
        // Fetch pricing plans from backend endpoint
        const url = '/api/api/v1/pricing/plans';
        
        // Get auth headers
        const authHeaders = (window as any).getAuthHeaders?.() || {};
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch pricing plans: ${response.statusText}`);
        }

        const plans: PricingPlan[] = await response.json();
        
        // For now, use the first plan as the current plan
        // In a real app, you'd determine this from user data or subscription status
        if (plans.length > 0) {
          setCurrentPlan(plans[0]);
        }
        
        setPlanLoading(false);
      } catch (error) {
        console.error('Failed to load pricing plans:', error);
        setPlanLoading(false);
      }
    };

    fetchPricingPlans();
  }, []);

  // Handle profile update
  const handleUpdate = async (updatedData: UpdateProfileData) => {
    if (!updateOperation) {
      throw new Error('No update operation available');
    }

    setIsUpdating(true);
    try {
      // Use the same URL construction as useApiCall: /api + operation.path
      const url = `/api${updateOperation.path}`;
      
      // Get auth headers from window (same as SPA)
      const authHeaders = (window as any).getAuthHeaders?.() || {};
      
      const response = await fetch(url, {
        method: updateOperation.method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.statusText}`);
      }

      const data = await response.json();
      setProfileData({
        data,
        isLoading: false,
        error: null,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <ProfileOverrideInternal
      profileData={profileData}
      onUpdate={handleUpdate}
      isUpdating={isUpdating}
      currentPlan={currentPlan}
      planLoading={planLoading}
    />
  );
};

// Export the override configuration
export default {
  targetId: 'me',
  mode: 'component' as const,
  component: ProfileOverride,
};
