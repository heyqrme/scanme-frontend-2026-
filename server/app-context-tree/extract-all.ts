import * as path from "node:path";
import {
  type CallExpression,
  Node,
  type Project,
  type SourceFile,
} from "ts-morph";
import {
  collectApiClientImport,
  processCallForApiCalls,
} from "./extract-api-calls";
import { processImportForComponents } from "./extract-components";
import { processImportForPages } from "./extract-pages";
import { processImportForUiFiles } from "./extract-used-files";
import { cachedResolveModule } from "./resolve-imports";

/**
 * Result of extracting all dependencies from a single source file.
 */
export interface ExtractionResult {
  importedPages: string[];
  importedComponents: string[];
  importedUiFiles: string[];
  apiClientCalls: string[];
  importPaths: Set<string>;
}

interface ExtractionOptions {
  workspacePath: string;
  pagesDir: string;
  componentsDir: string;
  srcDir: string;
  project: Project;
}

/**
 * Extract all dependencies from a source file in a single AST traversal.
 * Delegates to specialized processors in each extract-*.ts file.
 */
export function extractAllDependencies(
  sourceFile: SourceFile,
  options: ExtractionOptions,
): ExtractionResult {
  const { workspacePath, pagesDir, componentsDir, srcDir, project } = options;

  const pages = new Set<string>();
  const components = new Set<string>();
  const uiFiles = new Set<string>();
  const apiClientCalls = new Set<string>();
  const importPaths = new Set<string>();

  // Collect API client identifiers during import processing
  const apiClientImports = new Set<string>();

  // Collect call expressions for deferred processing (ensures imports are collected first)
  const callExpressions: CallExpression[] = [];

  const filePath = sourceFile.getFilePath();
  const fileDir = path.dirname(filePath);

  // Build contexts for each processor
  const pageCtx = { fileDir, workspaceRoot: workspacePath, pagesDir };
  const componentCtx = { fileDir, componentsDir };
  const uiFileCtx = { filePath, srcDir };

  try {
    // Single AST traversal - collect imports and call expressions
    sourceFile.forEachDescendant((node) => {
      // Process import declarations immediately
      if (Node.isImportDeclaration(node)) {
        const moduleSpecifier = node.getModuleSpecifierValue();

        // Extract import paths for traversal
        const resolved = resolveImportForTraversal(
          moduleSpecifier,
          filePath,
          workspacePath,
          project,
        );
        if (resolved) {
          importPaths.add(resolved);
        }

        // Delegate to page processor
        for (const pageName of processImportForPages(node, pageCtx)) {
          pages.add(pageName);
        }

        // Delegate to component processor
        for (const componentName of processImportForComponents(
          node,
          componentCtx,
        )) {
          components.add(componentName);
        }

        // Delegate to UI file processor
        const uiFilePath = processImportForUiFiles(node, uiFileCtx);
        if (uiFilePath) {
          uiFiles.add(uiFilePath);
        }

        // Collect API client imports
        const apiImports = collectApiClientImport(node);
        if (apiImports) {
          for (const id of apiImports) {
            apiClientImports.add(id);
          }
        }
      }

      // Collect call expressions for deferred processing
      if (Node.isCallExpression(node)) {
        callExpressions.push(node);
      }
    });

    // Process call expressions AFTER all imports have been collected
    for (const node of callExpressions) {
      // Check for dynamic imports
      const expression = node.getExpression();
      if (Node.isIdentifier(expression) && expression.getText() === "import") {
        const firstArg = node.getArguments()[0];
        if (firstArg && Node.isStringLiteral(firstArg)) {
          const moduleSpecifier = firstArg.getText().slice(1, -1);
          const resolved = resolveImportForTraversal(
            moduleSpecifier,
            filePath,
            workspacePath,
            project,
          );
          if (resolved) {
            importPaths.add(resolved);
          }
        }
      }

      // Delegate to API call processor (now apiClientImports is fully populated)
      const apiCall = processCallForApiCalls(node, apiClientImports);
      if (apiCall) {
        apiClientCalls.add(apiCall);
      }
    }
  } catch (err) {
    // Continue even if parsing fails
  }

  return {
    importedPages: Array.from(pages),
    importedComponents: Array.from(components),
    importedUiFiles: Array.from(uiFiles),
    apiClientCalls: Array.from(apiClientCalls),
    importPaths,
  };
}

/**
 * Resolve an import specifier to a normalized absolute path for traversal.
 */
function resolveImportForTraversal(
  moduleSpecifier: string,
  fromFile: string,
  workspacePath: string,
  project: Project,
): string | null {
  const resolved = cachedResolveModule(
    moduleSpecifier,
    fromFile,
    workspacePath,
    project,
  );
  return resolved ? path.normalize(path.resolve(resolved)) : null;
}
