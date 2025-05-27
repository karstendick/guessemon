// Helper function to build URLs that work with GitHub Pages base path
export function buildUrl(path: string): string {
  // For GitHub Pages, we need to include the repository name in the path
  // In development, this will be just the path
  const isDevelopment =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (isDevelopment) {
    return path;
  }

  // For GitHub Pages, the base path is /repository-name/
  // We can get this from the current pathname
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  const basePath = pathSegments.length > 0 ? `/${pathSegments[0]}` : '';

  // Remove leading slash from path and combine with base
  const cleanPath = path.replace(/^\//, '');
  return `${basePath}/${cleanPath}`;
}
