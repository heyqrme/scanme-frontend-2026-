import { APP_BASE_PATH, mode, Mode } from "app";

/**
 * Generates a properly formatted URL for QR codes and deep links that will work in both
 * development and production environments
 * 
 * @param path The relative path (without leading slash)
 * @param params Query parameters to include
 * @returns A fully qualified URL that will work when app is deployed
 */
export function getAppUrl(path: string, params: Record<string, string> = {}): string {
  // Start with origin for the base
  const baseUrl = window.location.origin;
  
  // Add the base path if it exists and we're in production
  const basePath = APP_BASE_PATH && APP_BASE_PATH !== '/' ? APP_BASE_PATH : '';
  
  // Build the path portion
  const pathWithBase = `${basePath}/${path}`.replace(/\/\/+/g, '/'); // Replace multiple slashes with single slash
  
  // Create URL object to handle query params correctly
  const url = new URL(pathWithBase, baseUrl);
  
  // Add query params
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.append(key, value);
    }
  });
  
  return url.toString();
}

/**
 * Checks if a URL points to a video file
 */
export const isVideoUrl = (url: string) => {
  if (!url) return false;
  
  // Check if it's a Firebase Storage URL
  if (url.includes('firebasestorage.googleapis.com') || url.includes('.firebasestorage.app')) {
    // Firebase Storage video - check if path contains video folder or has video in filename
    return url.includes('/videos/') || url.includes('/video/') || url.match(/\.(mp4|webm|ogg|mov|m4v)/i);
  }
  
  // Check for common video extensions or data URIs
  // Remove query params (everything after ?) and hash (everything after #) to correctly detect extension
  const cleanUrl = url.split(/[?#]/)[0];
  return cleanUrl.match(/\.(mp4|webm|ogg|mov|m4v)$/i) || url.startsWith('data:video/');
};

/**
 * Checks if a URL is a YouTube link
 */
export const isYouTubeUrl = (url: string) => {
  if (!url) return false;
  
  // Exclude Firebase Storage URLs that might have 'youtube' in the filename
  if (url.includes('firebasestorage.googleapis.com') || url.includes('.firebasestorage.app')) {
    return false;
  }
  
  return !!url.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/);
};

/**
 * Extracts the video ID from a YouTube URL
 */
export const getYouTubeId = (url: string) => {
  if (!url) return null;
  // Regex to support watch, embed, short links, and shorts
  // Updated to exclude trailing slash from the ID capture group
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?/\s]*).*/;
  const match = url.match(regExp);
  
  // Relax length check slightly (standard is 11, but safety first) and ensure we have a match
  return (match && match[2] && match[2].length === 11) ? match[2] : null;
};

/**
 * Normalizes a YouTube URL to a standard watch URL
 */
export const normalizeYouTubeUrl = (url: string) => {
  const id = getYouTubeId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : url;
};

/**
 * Extracts the video ID from a YouTube URL and returns the embed URL
 */
export const getYouTubeEmbedUrl = (url: string) => {
  const id = getYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}?autoplay=0&rel=0` : null;
};
