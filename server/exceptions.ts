import type { ErrorPayload } from "vite";
import type { UiErrorDescription } from "./devx-publish";

export const locToStack = (
  loc?: {
    file?: string;
    line: number;
    column: number;
  } | null,
): string | null => {
  if (!loc?.file) {
    return null;
  }
  return `${loc.file}:${loc.line}:${loc.column}`;
};

export const simplifyStack = (stack?: string | null): string | null => {
  if (!stack) {
    return null;
  }

  // Ignore blank lines and remove leading whitespace
  const lines = stack
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Ignore lines outside of sources but keep at least one
  const notRelevantLine = (line: string) => !line.includes("devx/ui/src");
  const lastIndex = lines.findIndex(notRelevantLine);
  const atLeastOneLine = lastIndex > 0 ? lastIndex : 1;

  // Clean filepaths in stacktrace, e.g.
  // https://riff.new/_projects/<projectid>/dbtn/devx/ui/src
  const cleanPath = (line: string) =>
    line.replace(/[a-z]+:\/\/.*dbtn.devx.ui\/src\//, "");

  return lines.slice(0, atLeastOneLine).map(cleanPath).join("\n");
};

export const formatError = (error: Error): string => {
  return `${error.name}: ${error.message}
${simplifyStack(error.stack) || ""}
`.trim();
};

// Sent from reportErrorToServerPlugin
export interface ErrorBoundaryPayload {
  name: string;
  message: string;
  stack?: string;
  componentStack?: string;
  digest?: string;
}

export const parseBoundaryErrorDescription = (
  payload: ErrorBoundaryPayload,
): UiErrorDescription => {
  const stack = simplifyStack(payload.componentStack || payload.stack || null);
  return {
    name: payload.name,
    message: payload.message,
    stack,
  };
};

export const parseViteErrorDescription = (
  payload: ErrorPayload,
): UiErrorDescription => {
  const stack = simplifyStack(payload.err.stack) || locToStack(payload.err.loc);
  return {
    name: "vite-error",
    message: payload.err.message,
    stack,
  };
};

export const parseReactErrorDescription = (
  payload: Error,
): UiErrorDescription => {
  // Is payload.cause something interesting?
  const stack = simplifyStack(payload.stack);
  return {
    name: payload.name,
    message: payload.message,
    stack,
  };
};
