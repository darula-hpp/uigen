import { useNavigate, useLocation, useParams } from 'react-router-dom';
import type { Resource } from '@uigen-dev/core';

/**
 * Navigation hook for consistent routing across the application
 * Implements Requirements 32.3, 32.4, 32.5
 */
export function useNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  return {
    // Current location info
    location,
    params,

    // Navigation methods
    goToList: (resourceSlug: string) => {
      navigate(`/${resourceSlug}`);
    },

    goToDetail: (resourceSlug: string, id: string) => {
      navigate(`/${resourceSlug}/${id}`);
    },

    goToCreate: (resourceSlug: string) => {
      navigate(`/${resourceSlug}/new`);
    },

    goToEdit: (resourceSlug: string, id: string) => {
      navigate(`/${resourceSlug}/${id}/edit`);
    },

    goToSearch: (resourceSlug: string) => {
      navigate(`/${resourceSlug}/search`);
    },

    goBack: () => {
      navigate(-1);
    },

    goForward: () => {
      navigate(1);
    },

    goToHome: () => {
      navigate('/');
    },

    // Generic navigation
    navigateTo: (path: string) => {
      navigate(path);
    },
  };
}

/**
 * Helper to build route paths
 */
export const routes = {
  list: (resourceSlug: string) => `/${resourceSlug}`,
  detail: (resourceSlug: string, id: string) => `/${resourceSlug}/${id}`,
  create: (resourceSlug: string) => `/${resourceSlug}/new`,
  edit: (resourceSlug: string, id: string) => `/${resourceSlug}/${id}/edit`,
  search: (resourceSlug: string) => `/${resourceSlug}/search`,
  home: () => '/',
};
