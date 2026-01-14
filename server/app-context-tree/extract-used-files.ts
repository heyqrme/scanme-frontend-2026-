import * as fs from "node:fs";
import * as path from "node:path";
import type { ImportDeclaration } from "ts-morph";

export interface UiFileExtractionContext {
  filePath: string;
  srcDir: string;
}

/** Utility patterns for detecting UI file imports */
const UTILITY_PATTERNS = [
  /\/utils\//,
  /\/lib\//,
  /\/hooks\//,
  /\/contexts\//,
  /\/api\//,
  /\/types\//,
  /\/constants\//,
  /\/config\//,
  /^utils\//,
  /^lib\//,
  /^hooks\//,
  /^contexts\//,
];

/**
 * Resolve a module specifier to an absolute path for utility imports.
 */
function resolveUtilityImportPath(
  moduleSpecifier: string,
  filePath: string,
  srcDir: string,
): string | null {
  if (moduleSpecifier.startsWith("@/")) {
    return path.resolve(srcDir, moduleSpecifier.slice(2));
  }
  if (moduleSpecifier.startsWith(".")) {
    return path.resolve(path.dirname(filePath), moduleSpecifier);
  }
  return null;
}

/**
 * Check if a module specifier is a utility import.
 */
function isUtilityImport(moduleSpecifier: string): boolean {
  return UTILITY_PATTERNS.some((pattern) => pattern.test(moduleSpecifier));
}

/**
 * Resolve and normalize a UI file import to a relative path from src.
 */
function resolveUiFilePath(
  moduleSpecifier: string,
  ctx: UiFileExtractionContext,
): string | null {
  const { filePath, srcDir } = ctx;

  try {
    const importPath = resolveUtilityImportPath(
      moduleSpecifier,
      filePath,
      srcDir,
    );

    if (!importPath) {
      return null;
    }

    const possiblePaths = [
      importPath,
      `${importPath}.tsx`,
      `${importPath}.ts`,
      path.join(importPath, "index.tsx"),
      path.join(importPath, "index.ts"),
    ];

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        const relativePath = path.relative(srcDir, possiblePath);
        if (!relativePath.startsWith("..") && !path.isAbsolute(relativePath)) {
          return relativePath.replace(/\\/g, "/");
        }
        break;
      }
    }
  } catch (err) {
    // Ignore resolution errors
  }

  return null;
}

/**
 * Extract UI file path from a single import declaration node.
 * Returns the relative path if this is a UI file import, null otherwise.
 */
export function processImportForUiFiles(
  node: ImportDeclaration,
  ctx: UiFileExtractionContext,
): string | null {
  const moduleSpecifier = node.getModuleSpecifierValue();

  if (!isUtilityImport(moduleSpecifier)) {
    return null;
  }

  return resolveUiFilePath(moduleSpecifier, ctx);
}
