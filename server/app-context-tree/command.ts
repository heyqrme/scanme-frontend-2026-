import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import { printResultsToStdout } from "../utils";
import { analyzeApp } from "./analyze-typescript";

/**
 * CLI entry point for TypeScript app context tree analysis.
 * Called from Python via subprocess.
 * Outputs JSON to stdout matching AppContextGraph structure (TypeScript parts only).
 */
async function appContextTreeCommand(args: string[]): Promise<void> {
  const [workspacePath] = args;

  if (!workspacePath) {
    console.error("Missing required argument: workspacePath");
    process.exit(1);
  }

  try {
    const result = await analyzeApp(workspacePath);
    printResultsToStdout(result);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
}

// Only run if called directly (not imported)
// ES module equivalent of require.main === module
const __filename = fileURLToPath(import.meta.url);
const isMainModule =
  pathToFileURL(process.argv[1] || "").href === import.meta.url;

if (isMainModule) {
  appContextTreeCommand(process.argv.slice(2)).catch((err) => {
    console.error(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    process.exit(1);
  });
}

export { appContextTreeCommand };
