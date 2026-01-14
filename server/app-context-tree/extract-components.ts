import * as fs from "node:fs";
import * as path from "node:path";
import type { ImportDeclaration } from "ts-morph";

export interface ComponentExtractionContext {
  fileDir: string;
  componentsDir: string;
}

/**
 * Check if a relative import resolves to a component file.
 */
function checkRelativeComponentImport(
  moduleSpecifier: string,
  fileDir: string,
  componentsDir: string,
): boolean {
  if (!moduleSpecifier.startsWith(".")) {
    return false;
  }
  try {
    const resolvedPath = path.resolve(fileDir, moduleSpecifier);
    const possiblePaths = [
      resolvedPath,
      `${resolvedPath}.tsx`,
      `${resolvedPath}.ts`,
      path.join(resolvedPath, "index.tsx"),
      path.join(resolvedPath, "index.ts"),
    ];

    for (const possiblePath of possiblePaths) {
      if (
        possiblePath.startsWith(componentsDir) &&
        fs.existsSync(possiblePath)
      ) {
        return true;
      }
    }
  } catch (err) {
    // If resolution fails, skip this import
  }
  return false;
}

/**
 * Check if a module specifier points to a component file.
 */
function checkIsComponentImport(
  moduleSpecifier: string,
  ctx: ComponentExtractionContext,
): boolean {
  const { fileDir, componentsDir } = ctx;

  // Direct pattern: contains /components/ or starts with components/
  const isDirectComponentImport =
    moduleSpecifier.includes("/components/") ||
    moduleSpecifier.startsWith("components/") ||
    moduleSpecifier.startsWith("@/components/");

  if (isDirectComponentImport) {
    return true;
  }

  // Check relative imports
  return checkRelativeComponentImport(moduleSpecifier, fileDir, componentsDir);
}

/**
 * Extract component names from a single import declaration node.
 * Returns array of component names if this is a component import, empty array otherwise.
 */
export function processImportForComponents(
  node: ImportDeclaration,
  ctx: ComponentExtractionContext,
): string[] {
  const moduleSpecifier = node.getModuleSpecifierValue();

  if (!checkIsComponentImport(moduleSpecifier, ctx)) {
    return [];
  }

  const components: string[] = [];

  const defaultImport = node.getDefaultImport();
  if (defaultImport) {
    const componentName = defaultImport.getText();
    if (componentName) {
      components.push(componentName);
    }
  }

  const namedImports = node.getNamedImports();
  for (const spec of namedImports) {
    components.push(spec.getName());
  }

  return components;
}
