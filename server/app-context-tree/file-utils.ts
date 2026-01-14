import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Recursively find files in a directory matching the given extension filter.
 * Excludes node_modules and returns relative paths from baseDir.
 */
export function findFilesRecursive(
  dir: string,
  baseDir: string,
  extensionFilter: (filename: string) => boolean,
): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip node_modules
    if (entry.name === "node_modules") {
      continue;
    }

    if (entry.isDirectory()) {
      // Recursively search subdirectories
      files.push(...findFilesRecursive(fullPath, baseDir, extensionFilter));
    } else if (entry.isFile() && extensionFilter(entry.name)) {
      // Get relative path from base directory
      const relativePath = path.relative(baseDir, fullPath);
      files.push(relativePath);
    }
  }

  return files;
}
