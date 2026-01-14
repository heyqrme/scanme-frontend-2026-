import * as fs from "node:fs";
import * as path from "node:path";
import type { Project } from "ts-morph";
import * as ts from "typescript";

interface TsConfigPaths {
  baseUrl?: string;
  paths?: Record<string, string[]>;
}

// Module-level cache for tsconfig.json parsing (keyed by workspace path)
const tsConfigCache = new Map<string, TsConfigPaths>();

// Module-level cache for file existence checks
const fileExistsCache = new Map<string, boolean>();

// Module-level cache for resolved module paths (keyed by "fromDir|moduleSpecifier")
const modulePathCache = new Map<string, string | null>();

export function clearTsConfigCache(): void {
  tsConfigCache.clear();
}

export function clearFileExistsCache(): void {
  fileExistsCache.clear();
}

export function clearModulePathCache(): void {
  modulePathCache.clear();
}

export function clearAllCaches(): void {
  tsConfigCache.clear();
  fileExistsCache.clear();
  modulePathCache.clear();
}

function cachedFileExists(filePath: string): boolean {
  const cached = fileExistsCache.get(filePath);
  if (cached !== undefined) {
    return cached;
  }
  const exists = fs.existsSync(filePath);
  fileExistsCache.set(filePath, exists);
  return exists;
}

/**
 * Check if a resolved path is within the workspace boundaries (security check).
 */
function isPathWithinWorkspace(
  resolvedPath: string,
  workspacePath: string,
): boolean {
  const normalizedResolved = path.normalize(path.resolve(resolvedPath));
  const normalizedWorkspace = path.normalize(path.resolve(workspacePath));
  return normalizedResolved.startsWith(normalizedWorkspace);
}

/**
 * Try to resolve a path to an actual file by checking different extensions and index files.
 * Returns the first existing file path, or null if none found.
 * Includes security check to ensure path is within workspace.
 */
function resolveFilePathWithExtensions(
  basePath: string,
  workspacePath: string,
  srcDir: string,
): string | null {
  // Security check: ensure base path is within workspace
  if (!isPathWithinWorkspace(basePath, workspacePath)) {
    return null;
  }

  // Try different extensions and index files
  const possiblePaths = [
    basePath,
    `${basePath}.tsx`,
    `${basePath}.ts`,
    path.join(basePath, "index.tsx"),
    path.join(basePath, "index.ts"),
  ];

  for (const possiblePath of possiblePaths) {
    try {
      if (cachedFileExists(possiblePath)) {
        // Additional security check
        if (
          isPathWithinWorkspace(possiblePath, workspacePath) &&
          (possiblePath.startsWith(srcDir) ||
            possiblePath.startsWith(workspacePath))
        ) {
          return path.resolve(possiblePath);
        }
      }
    } catch (err) {
      // Ignore file access errors (permissions, etc.) and continue
    }
  }

  // If it's a directory, try index files
  try {
    if (cachedFileExists(basePath)) {
      const stat = fs.statSync(basePath);
      if (
        stat.isDirectory() &&
        isPathWithinWorkspace(basePath, workspacePath)
      ) {
        const indexPaths = [
          path.join(basePath, "index.tsx"),
          path.join(basePath, "index.ts"),
        ];
        for (const indexPath of indexPaths) {
          try {
            if (
              cachedFileExists(indexPath) &&
              isPathWithinWorkspace(indexPath, workspacePath)
            ) {
              return path.resolve(indexPath);
            }
          } catch (err) {
            // Ignore index file access errors and continue
          }
        }
      }
    }
  } catch (err) {
    // If stat fails, return null (file may not exist or be inaccessible)
  }

  return null;
}

/**
 * Read and parse tsconfig.json to get path mappings.
 */
function getTsConfigPaths(workspacePath: string): TsConfigPaths {
  // Check cache first
  const cached = tsConfigCache.get(workspacePath);
  if (cached !== undefined) {
    return cached;
  }

  const tsConfigPath = path.join(workspacePath, "tsconfig.json");
  if (!cachedFileExists(tsConfigPath)) {
    const result: TsConfigPaths = {};
    tsConfigCache.set(workspacePath, result);
    return result;
  }

  try {
    const tsConfigContent = fs.readFileSync(tsConfigPath, "utf-8");
    const tsConfig = JSON.parse(tsConfigContent);
    const result: TsConfigPaths = {
      baseUrl: tsConfig.compilerOptions?.baseUrl,
      paths: tsConfig.compilerOptions?.paths,
    };
    tsConfigCache.set(workspacePath, result);
    return result;
  } catch (err) {
    const result: TsConfigPaths = {};
    tsConfigCache.set(workspacePath, result);
    return result;
  }
}

/**
 * Resolve a path alias using tsconfig paths configuration.
 * Matches the most specific pattern first (longer patterns take precedence).
 */
function resolvePathAlias(
  moduleSpecifier: string,
  paths: Record<string, string[]>,
  baseUrl: string,
  workspacePath: string,
): string | null {
  // Sort paths by specificity (longer patterns first) to match most specific first
  const sortedPaths = Object.entries(paths).sort(
    (a, b) => b[0].length - a[0].length,
  );

  for (const [pattern, replacements] of sortedPaths) {
    // Handle wildcard patterns like "components/*" or "@/hooks/*"
    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, -2);
      if (moduleSpecifier.startsWith(prefix)) {
        const suffix = moduleSpecifier.slice(prefix.length);
        for (const replacement of replacements) {
          if (replacement.endsWith("/*")) {
            const resolvedPath = replacement.slice(0, -2) + suffix;
            const base = baseUrl
              ? path.resolve(workspacePath, baseUrl)
              : workspacePath;
            return path.resolve(base, resolvedPath);
          }
        }
      }
    } else {
      // Exact match (no wildcard)
      if (moduleSpecifier === pattern) {
        for (const replacement of replacements) {
          const base = baseUrl
            ? path.resolve(workspacePath, baseUrl)
            : workspacePath;
          return path.resolve(base, replacement);
        }
      }
    }
  }

  return null;
}

/**
 * Compute a fallback path for module resolution when tsconfig paths don't match.
 * Handles common alias patterns like @/, components/, pages/, etc.
 */
function computeFallbackPath(
  moduleSpecifier: string,
  fromFile: string,
  srcDir: string,
): string {
  if (moduleSpecifier.startsWith("@/")) {
    // @/components/AppLayout -> src/components/AppLayout
    return path.resolve(srcDir, moduleSpecifier.slice(2));
  }
  if (
    moduleSpecifier.startsWith("components/") ||
    moduleSpecifier.startsWith("pages/") ||
    moduleSpecifier.startsWith("utils/") ||
    moduleSpecifier.startsWith("lib/")
  ) {
    // components/AppLayout -> src/components/AppLayout
    return path.resolve(srcDir, moduleSpecifier);
  }
  // Try relative to current file as last resort
  const fileDir = path.dirname(fromFile);
  return path.resolve(fileDir, moduleSpecifier);
}

/**
 * Resolve an import module specifier to an actual file path.
 * Handles relative imports, path aliases from tsconfig.json, and npm packages.
 * Returns null if the import cannot be resolved or is an external package.
 */
export function resolveImportPath(
  moduleSpecifier: string,
  fromFile: string,
  workspacePath: string,
  project: Project,
): string | null {
  const srcDir = path.join(workspacePath, "src");

  // Relative imports always resolve from the current file
  if (moduleSpecifier.startsWith(".")) {
    const fileDir = path.dirname(fromFile);
    const resolvedPath = path.resolve(fileDir, moduleSpecifier);
    return resolveFilePathWithExtensions(resolvedPath, workspacePath, srcDir);
  }

  // Get tsconfig paths configuration
  const { baseUrl, paths } = getTsConfigPaths(workspacePath);

  // Try to resolve using tsconfig paths
  if (paths) {
    const pathResolved = resolvePathAlias(
      moduleSpecifier,
      paths,
      baseUrl || ".",
      workspacePath,
    );
    if (pathResolved) {
      return resolveFilePathWithExtensions(pathResolved, workspacePath, srcDir);
    }
  }

  // Fallback: Check if it looks like an internal import (not an npm package)
  // This handles cases where tsconfig might not have all paths defined
  // but we still want to resolve common patterns
  const looksLikeInternal =
    moduleSpecifier.startsWith("@/") ||
    moduleSpecifier.startsWith("components/") ||
    moduleSpecifier.startsWith("pages/") ||
    moduleSpecifier.startsWith("utils/") ||
    moduleSpecifier.startsWith("lib/") ||
    (moduleSpecifier.includes("/") && !moduleSpecifier.includes("."));

  if (!looksLikeInternal) {
    return null; // Likely an npm package
  }

  // Last resort: try resolving relative to src (for backwards compatibility)
  // Handle path aliases like components/, pages/, @/, etc.
  const fallbackPath = computeFallbackPath(moduleSpecifier, fromFile, srcDir);

  // Only use fallback if it's within the workspace
  if (isPathWithinWorkspace(fallbackPath, workspacePath)) {
    return resolveFilePathWithExtensions(fallbackPath, workspacePath, srcDir);
  }

  return null;
}

/**
 * Use TypeScript's compiler API to resolve module imports accurately.
 * This is more accurate than manual parsing as it uses TypeScript's built-in resolution.
 */
function resolveModuleUsingCompiler(
  moduleSpecifier: string,
  fromFile: string,
  workspacePath: string,
  project: Project,
): string | null {
  try {
    // Get the underlying TypeScript program
    const program = project.getProgram().compilerObject;
    const compilerOptions = program.getCompilerOptions();

    // Create a minimal module resolution host
    const host: ts.ModuleResolutionHost = {
      fileExists: (fileName: string) => {
        try {
          return cachedFileExists(fileName);
        } catch {
          return false;
        }
      },
      readFile: (fileName: string) => {
        try {
          return fs.readFileSync(fileName, "utf-8");
        } catch {
          return undefined;
        }
      },
      getCurrentDirectory: () => workspacePath,
    };

    // Use TypeScript's resolveModuleName for accurate resolution
    // Note: as assertion needed due to type incompatibility between ts-morph and typescript
    const resolved = ts.resolveModuleName(
      moduleSpecifier,
      fromFile,
      compilerOptions as ts.CompilerOptions,
      host,
    );

    if (resolved.resolvedModule) {
      const resolvedPath = resolved.resolvedModule.resolvedFileName;
      // Only return if it's within the workspace
      if (resolvedPath && isPathWithinWorkspace(resolvedPath, workspacePath)) {
        return resolvedPath;
      }
    }

    return null;
  } catch (err) {
    // Fall back to manual resolution if compiler API fails
    return null;
  }
}

/**
 * Cached module resolution. Tries compiler API first, falls back to manual resolution.
 * Results are cached by fromFile directory + moduleSpecifier.
 */
export function cachedResolveModule(
  moduleSpecifier: string,
  fromFile: string,
  workspacePath: string,
  project: Project,
): string | null {
  const fromDir = path.dirname(fromFile);
  const cacheKey = `${workspacePath}|${fromDir}|${moduleSpecifier}`;

  const cached = modulePathCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const resolved =
    resolveModuleUsingCompiler(
      moduleSpecifier,
      fromFile,
      workspacePath,
      project,
    ) ?? resolveImportPath(moduleSpecifier, fromFile, workspacePath, project);

  modulePathCache.set(cacheKey, resolved);
  return resolved;
}
