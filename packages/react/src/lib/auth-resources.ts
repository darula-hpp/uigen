import type { UIGenApp, Resource } from '@uigen-dev/core';

/**
 * Determines if a resource is an auth-related resource that should be hidden
 * from navigation and dashboard.
 * 
 * Auth resources include:
 * - Login endpoints
 * - Sign up endpoints
 * - Password reset endpoints
 * - Refresh token endpoints
 * 
 * These resources are special system resources that should only be accessible
 * through dedicated auth flows, not as regular CRUD resources.
 */
export function isAuthResource(resource: Resource, config: UIGenApp): boolean {
  // Collect all auth endpoint paths
  const authPaths = new Set<string>();
  
  // Add login endpoint paths
  if (config.auth.loginEndpoints) {
    for (const endpoint of config.auth.loginEndpoints) {
      authPaths.add(endpoint.path);
    }
  }
  
  // Add signup endpoint paths
  if (config.auth.signUpEndpoints) {
    for (const endpoint of config.auth.signUpEndpoints) {
      authPaths.add(endpoint.path);
    }
  }
  
  // Add password reset endpoint paths
  if (config.auth.passwordResetEndpoints) {
    for (const endpoint of config.auth.passwordResetEndpoints) {
      authPaths.add(endpoint.path);
    }
  }
  
  // Add refresh endpoint paths
  if (config.auth.refreshEndpoints) {
    for (const endpoint of config.auth.refreshEndpoints) {
      authPaths.add(endpoint.path);
    }
  }
  
  // Check if any of the resource's operations match auth endpoint paths
  for (const operation of resource.operations) {
    if (authPaths.has(operation.path)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Filters out auth resources from a list of resources.
 * 
 * @param resources - Array of resources to filter
 * @param config - UIGen app configuration
 * @returns Array of resources with auth resources removed
 */
export function filterAuthResources(resources: Resource[], config: UIGenApp): Resource[] {
  return resources.filter(resource => !isAuthResource(resource, config));
}
