/**
 * Safely handles image URLs to prevent "Not allowed to load local resource" errors.
 * 
 * @param url The image URL to check
 * @param fallbackUrl Optional fallback URL to use if the primary URL is invalid
 * @returns A safe image URL or the fallback (undefined if no fallback provided)
 */
export function getSafeImageUrl(url: string | null | undefined, fallbackUrl?: string): string | undefined {
  if (!url) return fallbackUrl;

  // Check for blob URLs (created via URL.createObjectURL)
  if (url.startsWith("blob:")) {
    return url;
  }

  // Check for data URLs (base64)
  if (url.startsWith("data:")) {
    return url;
  }

  // Check for valid http/https URLs
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Check for absolute paths (starting with /) which are valid for public assets
  if (url.startsWith("/")) {
    return url;
  }

  // Detect and block local filesystem paths (Windows or Unix style)
  // e.g. "C:\Users\..." or "/Users/..." (if not starting with http/blob/etc and not a relative web path)
  
  if (url.startsWith("file:") || url.match(/^[a-zA-Z]:\\/)) {
    console.warn(`Blocked potentially unsafe local resource URL: ${url}`);
    return fallbackUrl;
  }

  // If it's a relative path (and not a windows path), allow it
  // This covers "/assets/..." or "assets/..."
  if (!url.includes(":") && !url.includes("\\")) {
     return url;
  }
  
  // Specific fix for the user reported issue with .mhtml or other local junk
  if (url.includes('Not allowed to load local resource')) {
    return fallbackUrl;
  }

  // Default fallback
  return fallbackUrl;
}
