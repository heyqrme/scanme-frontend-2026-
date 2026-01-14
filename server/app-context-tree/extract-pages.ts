import * as fs from "node:fs";
import * as path from "node:path";
import type { ImportDeclaration } from "ts-morph";

export interface PageExtractionContext {
  fileDir: string;
  workspaceRoot: string;
  pagesDir: string;
}

/**
 * Resolve a module specifier to a path and determine if it looks like a page import.
 */
function resolveModuleToPagePath(
  moduleSpecifier: string,
  fileDir: string,
  workspaceRoot: string,
  pagesDir: string,
): { pathResult: string | null; initialIsPage: boolean } {
  if (moduleSpecifier.startsWith("@/")) {
    const aliasPath = moduleSpecifier.replace("@/", "");
    const resolvedPath = path.resolve(workspaceRoot, "src", aliasPath);
    return {
      pathResult: resolvedPath,
      initialIsPage: aliasPath.startsWith("pages/"),
    };
  }
  if (moduleSpecifier.startsWith("pages/")) {
    return {
      pathResult: path.resolve(workspaceRoot, "src", moduleSpecifier),
      initialIsPage: true,
    };
  }
  if (moduleSpecifier.startsWith(".")) {
    const resolvedPath = path.resolve(fileDir, moduleSpecifier);
    return {
      pathResult: resolvedPath,
      initialIsPage: resolvedPath.startsWith(pagesDir),
    };
  }
  if (moduleSpecifier.includes("/pages/")) {
    return { pathResult: null, initialIsPage: true };
  }
  return { pathResult: null, initialIsPage: false };
}

/**
 * Verify that a resolved path actually points to an existing page file.
 */
function verifyPageFileExists(
  pathResult: string | null,
  initialIsPage: boolean,
  pagesDir: string,
): boolean {
  if (!pathResult || !initialIsPage) {
    return initialIsPage;
  }
  const possiblePaths = [
    pathResult,
    `${pathResult}.tsx`,
    `${pathResult}.ts`,
    path.join(pathResult, "index.tsx"),
    path.join(pathResult, "index.ts"),
  ];

  return possiblePaths.some(
    (possiblePath) =>
      possiblePath.startsWith(pagesDir) && fs.existsSync(possiblePath),
  );
}

/**
 * Check if a module specifier points to a page file.
 */
function checkIsPageImport(
  moduleSpecifier: string,
  ctx: PageExtractionContext,
): boolean {
  const { fileDir, workspaceRoot, pagesDir } = ctx;
  try {
    const { pathResult, initialIsPage } = resolveModuleToPagePath(
      moduleSpecifier,
      fileDir,
      workspaceRoot,
      pagesDir,
    );

    const verifiedIsPage = verifyPageFileExists(
      pathResult,
      initialIsPage,
      pagesDir,
    );

    // Handle imports within pages directory
    if (
      !verifiedIsPage &&
      fileDir.startsWith(pagesDir) &&
      moduleSpecifier.startsWith(".")
    ) {
      const resolvedRelative = path.resolve(fileDir, moduleSpecifier);
      const possiblePaths = [
        resolvedRelative,
        `${resolvedRelative}.tsx`,
        `${resolvedRelative}.ts`,
        path.join(resolvedRelative, "index.tsx"),
        path.join(resolvedRelative, "index.ts"),
      ];
      const foundPageFile = possiblePaths.some(
        (possiblePath) =>
          possiblePath.startsWith(pagesDir) && fs.existsSync(possiblePath),
      );
      if (foundPageFile) {
        return true;
      }
    }

    return verifiedIsPage;
  } catch (err) {
    // Fallback to pattern matching
    return (
      moduleSpecifier.includes("/pages/") ||
      moduleSpecifier.startsWith("pages/") ||
      moduleSpecifier.startsWith("@/pages/") ||
      !!moduleSpecifier.match(/^\.\.?\/.*pages\//)
    );
  }
}

/**
 * Extract page names from a single import declaration node.
 * Returns array of page names if this is a page import, empty array otherwise.
 */
export function processImportForPages(
  node: ImportDeclaration,
  ctx: PageExtractionContext,
): string[] {
  const moduleSpecifier = node.getModuleSpecifierValue();

  if (!checkIsPageImport(moduleSpecifier, ctx)) {
    return [];
  }

  const pages: string[] = [];

  const defaultImport = node.getDefaultImport();
  if (defaultImport) {
    const pageName = defaultImport.getText();
    if (pageName) {
      pages.push(pageName);
    }
  }

  const namedImports = node.getNamedImports();
  for (const spec of namedImports) {
    pages.push(spec.getName());
  }

  return pages;
}
