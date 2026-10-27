/**
 * Resolves the base URL of the application.
 * In production (e.g. Vercel), defaults to https://financial-journal-six.vercel.app.
 * In browser environment, uses the current window origin.
 */
export function getAppUrl(): string {
  // 1. Explicit env variable (configured in Vercel or .env)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }

  // 2. Client-side browser execution
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    // If not local testing, use current production origin
    if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      return origin;
    }
    // In local development, use localhost
    return origin;
  }

  // 3. Vercel deployment system URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // 4. Default production fallback
  return 'https://financial-journal-six.vercel.app';
}
