import type { IncomingMessage, ServerResponse } from "node:http";
import * as path from "node:path";
import getRawBody from "raw-body";
import type { Connect } from "vite";

import ts from "typescript";

function getScriptKind(filePath: string): ts.ScriptKind {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".ts":
      return ts.ScriptKind.TS;
    case ".tsx":
      return ts.ScriptKind.TSX;
    case ".js":
      return ts.ScriptKind.JS;
    case ".jsx":
      return ts.ScriptKind.JSX;
    case ".json":
      return ts.ScriptKind.JSON;
    default:
      return ts.ScriptKind.Unknown;
  }
}

export interface Diagnostic {
  file: string | null;
  line: number;
  char: number;
  message: string;
  // severity: "Warning" | "Error" | "Suggestion" | "Message";
  severity: string;
}

/**
 * Analyzes the given TypeScript contents for errors.
 *
 * @param {string} filePath - The path of the TypeScript file (used for reporting).
 * @param {string} fileContents - The modified contents of the TypeScript file.
 * @param {string} rootDir - The path to the directory where tsconfig.json resides
 * @returns {Array} diagnostics - A list of diagnostic objects with file, line, char, message, and severity.
 */
function analyzeTypeScript(
  filePath: string,
  fileContents: string,
  rootDir: string,
): { diagnostics: Diagnostic[] } {
  const configFileName = ts.findConfigFile(
    rootDir,
    ts.sys.fileExists,
    "tsconfig.json",
  );

  if (!configFileName) {
    throw new Error(
      `Could not find a valid 'tsconfig.json' at the specified root directory: ${rootDir}`,
    );
  }

  const configFileContents = ts.sys.readFile(configFileName);

  if (!configFileContents) {
    throw new Error(
      `Could not read the 'tsconfig.json' file at the specified root directory: ${rootDir}`,
    );
  }

  const parsedConfig = ts.parseConfigFileTextToJson(
    configFileName,
    configFileContents,
  );

  if (parsedConfig.error) {
    throw new Error(
      `Error parsing 'tsconfig.json': ${ts.formatDiagnosticsWithColorAndContext(
        [parsedConfig.error],
        {
          getCanonicalFileName: (fileName) => fileName,
          getCurrentDirectory: ts.sys.getCurrentDirectory,
          getNewLine: () => ts.sys.newLine,
        },
      )}`,
    );
  }

  const parsedCommandLine = ts.parseJsonConfigFileContent(
    parsedConfig.config,
    ts.sys,
    path.dirname(configFileName),
  );

  // Create a SourceFile object from the modified contents
  const sourceFile = ts.createSourceFile(
    filePath,
    fileContents,
    ts.ScriptTarget.ESNext,
    true,
    getScriptKind(filePath),
  );

  // Set up a TypeScript program and check for errors
  const host = ts.createCompilerHost(parsedCommandLine.options);
  const originalGetSourceFile = host.getSourceFile;
  const program = ts.createProgram(
    [filePath],
    { ...parsedCommandLine.options, noEmit: true },
    {
      ...host,
      getSourceFile: (
        name,
        languageVersion,
        onError,
        shouldCreateNewSourceFile,
      ) => {
        return name === filePath
          ? sourceFile
          : originalGetSourceFile(
              name,
              languageVersion,
              onError,
              shouldCreateNewSourceFile,
            );
      },
    },
  );
  const diagnostics = ts.getPreEmitDiagnostics(program);

  // Map diagnostics to a more readable format
  return {
    diagnostics: diagnostics.map((diagnostic) => {
      let line: number;
      let character: number;

      if (diagnostic.file && diagnostic.start !== undefined) {
        const { line: diagLine, character: diagChar } =
          diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        line = diagLine + 1;
        character = diagChar + 1;
      } else {
        line = 0;
        character = 0;
      }

      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n",
      );

      // 0: warning, 1: error, 2: suggestion, 3: message
      const severity =
        ["warning", "error", "suggestion", "message"][diagnostic.category] ??
        null;

      return {
        file: diagnostic.file ? diagnostic.file.fileName : null,
        line,
        char: character,
        message,
        severity,
      };
    }),
  };
}

export const handleTryTscCompile = async (
  req: Connect.IncomingMessage,
  res: ServerResponse<IncomingMessage>,
  next: Connect.NextFunction,
) => {
  if (req.method === "POST") {
    const rootDir = "./";
    try {
      const raw = await getRawBody(req);
      const { code, filename } = JSON.parse(raw.toString());
      const result = analyzeTypeScript(filename, code, rootDir);
      res.end(JSON.stringify(result, null, 2));
    } catch (err) {
      console.log(err);
      res.statusCode = 500;
      res.end("Error trying to compile code with tsc");
    }
  } else {
    next();
  }
};
