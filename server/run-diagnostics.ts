import { type ImportDeclaration, Project, type SourceFile } from "ts-morph";
import { printResultsToStdout } from "./utils";

type DiagnosticResult = {
  message: string;
  location: {
    filepath: string;
    line?: number;
  };
  severity: "error" | "warning" | "info";
  type:
    | "missing-file"
    | "missing-named-export"
    | "missing-default-export"
    | "unresolved-import";
};

interface DiagnosticResults {
  filepath: string;
  results: DiagnosticResult[];
  duration: number;
}

const isNodeModulesImport = (importDeclaration: ImportDeclaration) => {
  return importDeclaration
    .getModuleSpecifierSourceFile()
    ?.getFilePath()
    .includes("node_modules");
};

const getExportsFromFile = (file: SourceFile): string[] => {
  return file.getExportSymbols().map((it) => it.getEscapedName());
};

const hasExport = (file: SourceFile, exportName: string) => {
  const exports = getExportsFromFile(file);
  return exports.includes(exportName);
};

const loadSourceFile = (
  project: Project,
  filepath: string,
): SourceFile | null => {
  try {
    return project.addSourceFileAtPath(filepath);
  } catch (error) {
    return null;
  }
};

const runDiagnosticsForFile = ({
  project,
  sourceFiles,
}: {
  project: Project;
  sourceFiles: SourceFile[];
}): DiagnosticResult[] => {
  // If there are no more files to check, return an empty array
  if (sourceFiles.length === 0) {
    return [];
  }

  const results: DiagnosticResult[] = [];
  const newFilesFound: SourceFile[] = [];

  for (const sourceFile of sourceFiles) {
    for (const node of sourceFile.getImportDeclarations()) {
      // Skip node_modules imports
      if (isNodeModulesImport(node)) {
        continue;
      }

      // Skip CSS, JSON, and SVG imports
      if (/\.(css|json|svg)/i.test(node.getModuleSpecifier().getText())) {
        continue;
      }

      const moduleSpecifierSourceFile = node.getModuleSpecifierSourceFile();

      // If the module specifier source file is not found, add an error
      if (!moduleSpecifierSourceFile) {
        results.push({
          message: `Import could not be resolved: '${node.getText()}'`,
          severity: "error",
          type: "unresolved-import",
          location: {
            filepath: sourceFile.getFilePath(),
            line: node.getStartLineNumber(),
          },
        });
        continue;
      }

      newFilesFound.push(moduleSpecifierSourceFile);

      const defaultImport = node.getDefaultImport();
      if (defaultImport && !hasExport(moduleSpecifierSourceFile, "default")) {
        results.push({
          message: `Default export '${defaultImport.getText()}' not found in '${moduleSpecifierSourceFile.getFilePath()}'`,
          severity: "error",
          type: "missing-default-export",
          location: {
            filepath: sourceFile.getFilePath(),
            line: defaultImport.getStartLineNumber(),
          },
        });
      }

      for (const it of node.getNamedImports()) {
        // If the module specifier source file does not have the export, add an error
        if (!hasExport(moduleSpecifierSourceFile, it.getName())) {
          results.push({
            message: `Named export '${it.getName()}' not found in '${moduleSpecifierSourceFile.getFilePath()}'`,
            severity: "error",
            type: "missing-named-export",
            location: {
              filepath: sourceFile.getFilePath(),
              line: it.getStartLineNumber(),
            },
          });
        }
      }
    }

    // Early return if we have found any errors
    if (results.length > 0) {
      return results;
    }
  }

  // Early return if we have found any errors
  if (results.length > 0) {
    return results;
  }

  return runDiagnosticsForFile({
    project,
    sourceFiles: newFilesFound,
  });
};

const runDiagnostics = (filepath: string): DiagnosticResults => {
  const start = Date.now();

  // Start a project with the correct tsconfig
  const project = new Project({
    tsConfigFilePath: "./tsconfig.json",
    skipAddingFilesFromTsConfig: true,
  });

  // Load the file into the project
  const sourceFile = loadSourceFile(project, filepath);

  if (!sourceFile) {
    return {
      duration: Date.now() - start,
      filepath,
      results: [
        {
          message: "Target file not found",
          severity: "error",
          type: "missing-file",
          location: {
            filepath,
          },
        },
      ],
    };
  }

  const results: DiagnosticResult[] = runDiagnosticsForFile({
    project,
    sourceFiles: [sourceFile],
  });

  return {
    duration: Date.now() - start,
    filepath,
    results,
  };
};

function runDiagnosticsCommand(args: string[]) {
  const [filepath] = args;

  if (!filepath) {
    console.error("Missing required arguments: filepath");
    process.exit(1);
  }

  return runDiagnostics(filepath);
}

const result = runDiagnosticsCommand(process.argv.slice(2));

printResultsToStdout(result);
