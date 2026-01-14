import * as fs from "node:fs";
import * as path from "node:path";
import type { Project } from "ts-morph";
import { extractAllDependencies } from "./extract-all";
import { clearAllCaches } from "./resolve-imports";
import type { ComponentNode, PageNode, UiFileNode } from "./types";

interface TraversalContext {
  workspacePath: string;
  project: Project;
  pagesDir: string;
  componentsDir: string;
  srcDir: string;
  seen: Set<string>; // Absolute file paths we've already analyzed
  pages: Map<string, PageNode>; // filepath -> PageNode
  components: Map<string, ComponentNode>; // filepath -> ComponentNode
  uiFiles: Map<string, UiFileNode>; // filepath -> UiFileNode
}

/**
 * Determine the category of a file (page, component, or UI file).
 */
function categorizeFile(
  filePath: string,
  context: TraversalContext,
): "page" | "component" | "uiFile" | "other" {
  const { pagesDir, componentsDir, srcDir } = context;

  // Normalize paths for comparison
  const normalizedFilePath = path.normalize(path.resolve(filePath));
  const normalizedPagesDir = path.normalize(path.resolve(pagesDir));
  const normalizedComponentsDir = path.normalize(path.resolve(componentsDir));
  const normalizedSrcDir = path.normalize(path.resolve(srcDir));

  if (normalizedFilePath.startsWith(normalizedPagesDir)) {
    return "page";
  }

  if (normalizedFilePath.startsWith(normalizedComponentsDir)) {
    return "component";
  }

  // Check if it's a UI file (utils, lib, hooks, etc.)
  const utilityDirs = [
    "utils",
    "lib",
    "hooks",
    "contexts",
    "api",
    "types",
    "constants",
    "config",
  ];

  for (const dirName of utilityDirs) {
    const utilityDir = path.normalize(path.resolve(path.join(srcDir, dirName)));
    if (normalizedFilePath.startsWith(utilityDir)) {
      return "uiFile";
    }
  }

  return "other";
}

/**
 * Analyze a file and extract its dependencies.
 * Returns the node data and a list of imported file paths to traverse.
 */
function analyzeFile(
  filePath: string,
  context: TraversalContext,
): {
  node: PageNode | ComponentNode | UiFileNode | null;
  importPaths: string[];
  category: "page" | "component" | "uiFile" | "other";
} {
  const { workspacePath, project, pagesDir } = context;

  if (!fs.existsSync(filePath)) {
    return { node: null, importPaths: [], category: "other" };
  }

  // Ensure it's a file, not a directory.
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return { node: null, importPaths: [], category: "other" };
    }
  } catch (err) {
    // If stat fails, skip this path
    return { node: null, importPaths: [], category: "other" };
  }

  try {
    const sourceFile = project.addSourceFileAtPath(filePath);
    if (!sourceFile) {
      return { node: null, importPaths: [], category: "other" };
    }

    // Extract all dependencies in a single AST walk
    const extraction = extractAllDependencies(sourceFile, {
      workspacePath,
      pagesDir,
      componentsDir: context.componentsDir,
      srcDir: context.srcDir,
      project,
    });

    // Get file metadata
    const relativePath = path.relative(workspacePath, filePath);
    const fileName = path.basename(filePath, path.extname(filePath));
    const category = categorizeFile(filePath, context);

    // Create node based on category (all node types have the same structure)
    const node: PageNode | ComponentNode | UiFileNode | null =
      category === "page" || category === "component" || category === "uiFile"
        ? {
            name: fileName,
            filepath: relativePath,
            importedPages: extraction.importedPages,
            importedComponents: extraction.importedComponents,
            apiClientCalls: extraction.apiClientCalls,
            importedUiFiles: extraction.importedUiFiles,
          }
        : null;

    return { node, importPaths: Array.from(extraction.importPaths), category };
  } catch (err) {
    // If file parsing fails, return empty
    return { node: null, importPaths: [], category: "other" };
  }
}

/**
 * Traverse the dependency graph starting from entry points.
 * Recursively follows imports and builds the graph of used files.
 */
export function traverseFromEntryPoints(
  entryPoints: string[],
  workspacePath: string,
  project: Project,
): {
  pages: PageNode[];
  components: ComponentNode[];
  uiFiles: UiFileNode[];
} {
  // Clear caches
  clearAllCaches();

  const pagesDir = path.join(workspacePath, "src", "pages");
  const componentsDir = path.join(workspacePath, "src", "components");
  const srcDir = path.join(workspacePath, "src");

  const context: TraversalContext = {
    workspacePath,
    project,
    pagesDir,
    componentsDir,
    srcDir,
    seen: new Set(),
    pages: new Map(),
    components: new Map(),
    uiFiles: new Map(),
  };

  // Queue of files to process (BFS traversal)
  const queue: string[] = [];
  const normalizedSrcDir = path.normalize(path.resolve(srcDir));

  // Add entry points to queue
  for (const entryPoint of entryPoints) {
    const absolutePath = path.normalize(path.resolve(entryPoint));
    if (!context.seen.has(absolutePath)) {
      queue.push(absolutePath);
      context.seen.add(absolutePath);
    }
  }

  // Process queue (with safety limit to prevent infinite loops)
  const MAX_FILES_TO_PROCESS = 10000; // Safety limit
  let filesProcessed = 0;

  while (queue.length > 0 && filesProcessed < MAX_FILES_TO_PROCESS) {
    const currentFile = queue.shift();
    if (!currentFile) break;
    filesProcessed++;
    const { node, importPaths, category } = analyzeFile(currentFile, context);

    // Store node if it's a page, component, or UI file
    if (node) {
      if (category === "page") {
        context.pages.set(node.filepath, node);
      } else if (category === "component") {
        context.components.set(node.filepath, node);
      } else if (category === "uiFile") {
        context.uiFiles.set(node.filepath, node);
      }
    }

    // Add imported files to queue if not seen
    for (const importPath of importPaths) {
      if (!context.seen.has(importPath)) {
        // Only traverse files within the workspace src directory
        if (importPath.startsWith(normalizedSrcDir)) {
          // Ensure it's a file, not a directory
          try {
            if (fs.existsSync(importPath)) {
              const stat = fs.statSync(importPath);
              if (stat.isFile()) {
                queue.push(importPath);
                context.seen.add(importPath);
              }
            }
          } catch (err) {
            // If stat fails, skip this path
          }
        }
      }
    }
  }

  if (filesProcessed >= MAX_FILES_TO_PROCESS) {
    console.error(
      `⚠️  Warning: Reached maximum file processing limit (${MAX_FILES_TO_PROCESS}). Graph may be incomplete.`,
    );
  }

  return {
    pages: Array.from(context.pages.values()),
    components: Array.from(context.components.values()),
    uiFiles: Array.from(context.uiFiles.values()),
  };
}
