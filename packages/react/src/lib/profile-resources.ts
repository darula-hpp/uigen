import type { UIGenApp, Resource } from '@uigen-dev/core';

/**
 * Determines if a resource is marked as a profile resource.
 * 
 * Profile resources are marked with the x-uigen-profile annotation
 * and should be rendered as dedicated profile pages with card-based
 * layouts instead of generic table views.
 * 
 * @param resource - The resource to check
 * @returns true if the resource is explicitly marked as a profile resource
 */
export function isProfileResource(resource: Resource): boolean {
  return resource.__profileAnnotation === true;
}

/**
 * Filters out profile resources from a list of resources.
 * 
 * This is used to exclude profile resources from the dashboard
 * resource list, keeping the dashboard focused on data management
 * resources.
 * 
 * @param resources - Array of resources to filter
 * @returns Array of resources with profile resources removed
 */
export function filterProfileResources(resources: Resource[]): Resource[] {
  return resources.filter(resource => !isProfileResource(resource));
}

/**
 * Finds the first profile resource in the application config.
 * 
 * If multiple profile resources exist, logs a warning and returns
 * the first one. The system supports one profile resource per
 * application.
 * 
 * @param config - UIGen app configuration
 * @returns The first profile resource, or undefined if none exist
 */
export function findProfileResource(config: UIGenApp): Resource | undefined {
  const profileResources = config.resources.filter(isProfileResource);
  
  if (profileResources.length === 0) {
    return undefined;
  }
  
  if (profileResources.length > 1) {
    const resourceNames = profileResources.map(r => r.name).join(', ');
    console.warn(
      `Multiple profile resources found: ${resourceNames}. Using first: ${profileResources[0].name}`
    );
  }
  
  return profileResources[0];
}
