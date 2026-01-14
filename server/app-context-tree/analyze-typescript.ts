import * as fs from "node:fs";
import * as path from "node:path";
import { Project } from "ts-morph";
import { discoverEntryPoints } from "./discover-entry-points";
import { traverseFromEntryPoints } from "./traverse-from-entry";
import type { ComponentNode, PageNode, UiFileNode } from "./types";

export interface AppAnalysisResult {
  pages: PageNode[];
  components: ComponentNode[];
  uiFiles: UiFileNode[];
}

/**
 * Main app analyzer that traverses from entry points to build the dependency graph.
 * Starts from entry points discovered via tsconfig and recursively follows imports.
 * Only files that are actually used (reachable from entry points) are included.
 */
export async function analyzeApp(
  workspacePath: string,
): Promise<AppAnalysisResult> {
  // Input validation
  if (!workspacePath || typeof workspacePath !== "string") {
    throw new Error("workspacePath must be a non-empty string");
  }

  const normalizedWorkspacePath = path.resolve(workspacePath);
  if (!fs.existsSync(normalizedWorkspacePath)) {
    throw new Error(
      `Workspace path does not exist: ${normalizedWorkspacePath}`,
    );
  }

  const startTime = Date.now();

  // Step 1: Create ts-morph Project with tsconfig
  const projectStart = Date.now();
  const tsConfigPath = path.join(normalizedWorkspacePath, "tsconfig.json");
  const project = new Project({
    tsConfigFilePath: fs.existsSync(tsConfigPath) ? tsConfigPath : undefined,
    skipAddingFilesFromTsConfig: true,
  });
  const projectTime = Date.now() - projectStart;

  // Step 2: Discover entry points using tsconfig
  const entryDiscoveryStart = Date.now();
  const entryPoints = discoverEntryPoints(normalizedWorkspacePath, project);
  const entryDiscoveryTime = Date.now() - entryDiscoveryStart;

  if (entryPoints.length === 0) {
    console.error("⚠️  No entry points found. Returning empty graph.");
    return {
      pages: [],
      components: [],
      uiFiles: [],
    };
  }

  // Step 3: Traverse from entry points
  const traversalStart = Date.now();
  const { pages, components, uiFiles } = traverseFromEntryPoints(
    entryPoints,
    normalizedWorkspacePath,
    project,
  );
  const traversalTime = Date.now() - traversalStart;

  const totalTime = Date.now() - startTime;

  // Print timing information to stderr in a formatted way
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  console.error(
    `\n⏱️  TypeScript Analysis Timing:\n   Project Init:    ${formatTime(
      projectTime,
    )}\n   Entry Discovery: ${formatTime(
      entryDiscoveryTime,
    )}\n   Traversal:       ${formatTime(
      traversalTime,
    )}\n   ──────────────────────\n   Total: ${formatTime(
      totalTime,
    )}\n   Entry Points: ${entryPoints.length}\n   Files Analyzed: ${
      pages.length
    } pages, ${components.length} components, ${uiFiles.length} UI files\n`,
  );

  return {
    pages,
    components,
    uiFiles,
  };
}
