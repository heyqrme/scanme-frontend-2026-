/**
 * Utility functions for Avatar display logic
 */

export { getSafeImageUrl } from "./image";

/**
 * Returns the text to display in an AvatarFallback.
 * If relationshipStatus is provided, returns its first letter (uppercase).
 * Otherwise, returns the first letter of the display name (uppercase).
 * Fallback to "?" if nothing is provided.
 * 
 * @param displayName The user's display name
 * @param relationshipStatus The user's relationship status (Single, Looking, Just Friends, etc.)
 * @returns The single character string to display
 */
export function getAvatarFallbackText(displayName?: string | null, relationshipStatus?: string | null): string {
  if (relationshipStatus) {
    return relationshipStatus.charAt(0).toUpperCase();
  }
  
  if (displayName) {
    return displayName.charAt(0).toUpperCase();
  }
  
  return "?";
}

/**
 * Returns the color class (or style object) for the Avatar based on relationship status.
 * This can be used to color-code the avatar border or background if needed.
 * Currently returns a tailwind text color class.
 */
export function getRelationshipColorClass(relationshipStatus?: string | null): string {
  switch (relationshipStatus) {
    case 'Single':
      return 'text-cyan-400'; // Neon Cyan
    case 'Looking':
      return 'text-fuchsia-400'; // Neon Fuchsia
    case 'Just Friends':
      return 'text-red-400'; // Neon Red
    case 'Taken':
      return 'text-purple-400'; // Neon Purple
    default:
      return 'text-gray-400';
  }
}

/**
 * Returns the hex color for the relationship status.
 * Useful for QR codes or inline styles.
 */
export function getRelationshipColorHex(relationshipStatus?: string | null): string {
  switch (relationshipStatus) {
    case 'Single':
      return '#22d3ee'; // Neon Cyan
    case 'Looking':
      return '#e879f9'; // Neon Fuchsia
    case 'Just Friends':
      return '#f87171'; // Neon Red
    case 'Taken':
      return '#a855f7'; // Neon Purple
    default:
      return '#9ca3af'; // Gray 400
  }
}

/**
 * Returns the border/ring color class for the Avatar based on relationship status.
 * Intended for use with tailwind 'ring-*' classes.
 */
export function getRelationshipBorderColorClass(relationshipStatus?: string | null, isOnline?: boolean): string {
  // If online, maybe we want to keep the green ring? Or combine?
  // The original code used green ring for online.
  // If we want relationship status to be the primary indicator:
  
  if (isOnline) {
     return 'ring-green-500/80 group-hover:ring-green-400';
  }

  switch (relationshipStatus) {
    case 'Single':
      return 'ring-cyan-500/50 group-hover:ring-cyan-400';
    case 'Looking':
      return 'ring-fuchsia-500/50 group-hover:ring-fuchsia-400';
    case 'Just Friends':
      return 'ring-red-500/50 group-hover:ring-red-400';
    case 'Taken':
      return 'ring-purple-500/80 group-hover:ring-purple-400';
    default:
      return 'ring-purple-500/30 group-hover:ring-purple-400';
  }
}

/**
 * Returns the gradient classes for AvatarFallback background.
 */
export function getRelationshipGradientClass(relationshipStatus?: string | null): string {
  switch (relationshipStatus) {
    case 'Single':
      return 'from-cyan-600 to-blue-600';
    case 'Looking':
      return 'from-fuchsia-600 to-pink-600';
    case 'Just Friends':
      return 'from-red-600 to-orange-600';
    case 'Taken':
      return 'from-purple-600 to-indigo-600';
    default:
      return 'from-purple-600 to-blue-600';
  }
}
