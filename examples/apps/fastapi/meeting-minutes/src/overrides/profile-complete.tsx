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

interface ProfileOverrideInternalProps {
  profileData: ProfileData;
  onUpdate: (data: UpdateProfileData) => Promise<void>;
  isUpdating: boolean;
}

const ProfileOverrideInternal: React.FC<ProfileOverrideInternalProps> = ({ 
  profileData, 
  onUpdate, 
  isUpdating 
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
    <div className="profile-container">
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
      
      <style>{`
        .profile-container {
          width: 100%;
          padding: 40px 20px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }
        
        .profile-card {
          border-radius: var(--radius);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 600px;
          width: 100%;
          overflow: hidden;
          border: 1px solid var(--border);
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
        
        @media (max-width: 768px) {
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
        const authHeaders = window.getAuthHeaders();
        
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
      const authHeaders = window.getAuthHeaders();
      
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
    />
  );
};

// Export the override configuration
export default {
  targetId: 'me',
  mode: 'component' as const,
  component: ProfileOverride,
};
