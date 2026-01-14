import * as fs from "node:fs";
import * as path from "node:path";
import type { Project } from "ts-morph";

/**
 * Common entry point file names to look for.
 * Ordered by priority (most common first).
 */
const ENTRY_POINT_PATTERNS = [
  "main.tsx",
  "main.ts",
  "App.tsx",
  "App.ts",
  "AppWrapper.tsx",
  "AppWrapper.ts",
  "router.tsx",
  "router.ts",
  "index.tsx",
  "index.ts",
];

/**
 * Parse tsconfig.json and extract include paths.
 * Returns resolved absolute paths for each include entry.
 */
function getIncludePathsFromTsConfig(workspacePath: string): string[] {
  const defaultPaths = [path.join(workspacePath, "src")];
  const tsConfigPath = path.join(workspacePath, "tsconfig.json");

  if (!fs.existsSync(tsConfigPath)) {
    return defaultPaths;
  }

  try {
    const tsConfigContent = fs.readFileSync(tsConfigPath, "utf-8");
    const tsConfig = JSON.parse(tsConfigContent);

    if (Array.isArray(tsConfig.include)) {
      return tsConfig.include
        .filter((p: string) => typeof p === "string")
        .map((p: string) => {
          // Resolve include paths relative to workspace
          if (p.startsWith("src") || p.startsWith("./src")) {
            return path.join(workspacePath, p.replace(/^\.\//, ""));
          }
          return path.join(workspacePath, p);
        });
    }
  } catch (err) {
    // If tsconfig parsing fails, use default
  }

  return defaultPaths;
}

/**
 * Discover entry point files for the application using tsconfig.
 * Looks for common entry point patterns within tsconfig's include paths.
 * Falls back to src/main.tsx if no entry points are found.
 */
export function discoverEntryPoints(
  workspacePath: string,
  project: Project,
): string[] {
  const entryPoints: string[] = [];
  const srcDir = path.join(workspacePath, "src");

  // Get tsconfig include paths
  const includePaths = getIncludePathsFromTsConfig(workspacePath);

  // Search for entry point files in include paths
  for (const includePath of includePaths) {
    if (!fs.existsSync(includePath)) {
      continue;
    }

    // Check if it's a directory or file
    const stat = fs.statSync(includePath);
    if (stat.isFile()) {
      // If include path is a file, check if it matches entry point pattern
      const fileName = path.basename(includePath);
      if (
        ENTRY_POINT_PATTERNS.some((pattern) => fileName === pattern) &&
        (includePath.endsWith(".tsx") || includePath.endsWith(".ts"))
      ) {
        entryPoints.push(includePath);
      }
    } else {
      // Search in directory root level ONLY (not in subdirectories)
      // Entry points are typically at src/main.tsx, src/AppWrapper.tsx, etc.
      // NOT at src/pages/App.tsx or src/components/App.tsx
      for (const pattern of ENTRY_POINT_PATTERNS) {
        const candidatePath = path.join(includePath, pattern);
        if (fs.existsSync(candidatePath)) {
          // Ensure it's at the root level (not in a subdirectory)
          const relativeToSrc = path.relative(srcDir, candidatePath);
          const isInSubdirectory = relativeToSrc.includes(path.sep);

          if (!isInSubdirectory) {
            // Validate it's a TypeScript file that can be parsed
            try {
              const sourceFile = project.addSourceFileAtPath(candidatePath);
              if (sourceFile) {
                entryPoints.push(candidatePath);
              }
            } catch (err) {
              // Skip if file can't be parsed
            }
          }
        }
      }
    }
  }

  // Remove duplicates
  const uniqueEntryPoints = Array.from(new Set(entryPoints));

  // If no entry points found, use default fallback
  if (uniqueEntryPoints.length === 0) {
    const defaultEntry = path.join(srcDir, "main.tsx");
    if (fs.existsSync(defaultEntry)) {
      try {
        const sourceFile = project.addSourceFileAtPath(defaultEntry);
        if (sourceFile) {
          return [defaultEntry];
        }
      } catch (err) {
        // If default entry can't be parsed, return empty
      }
    }
  }

  return uniqueEntryPoints;
}
