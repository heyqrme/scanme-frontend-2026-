import type { ErrorInfo, ReactNode } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { Mode, mode } from "../constants";
import { DevErrorPage } from "./DevErrorPage";
import { reportErrorToServerPlugin } from "./error-boundary-report";

const getErrorMessage = (err: unknown) => {
  if (err instanceof Error) {
    const message = err.message
      .replaceAll(`${window.location.origin}/ui/src`, "")
      .replaceAll(/\?t=\d*/g, "");

    return message;
  }

  return "Something went wrong";
};

const fallbackRender = (params: FallbackProps) => {
  return (
    <DevErrorPage
      text={
        <div
          style={{
            display: "flex",
            flexFlow: "column",
          }}
        >
          <p style={{ fontWeight: "bold" }}>An error occured:</p>
          <p>{getErrorMessage(params.error)}</p>

          {mode === Mode.DEV && (
            <p style={{ marginTop: "40px", fontWeight: "bold" }}>
              You can find more info in the console or by asking the agent to
              debug the error.
            </p>
          )}
        </div>
      }
      canRefresh={true}
    />
  );
};

const handleError = (error: Error, errorInfo: ErrorInfo) => {
  console.error(error.message);
  reportErrorToServerPlugin(error, errorInfo);
};

export const UserErrorBoundary = ({ children }: { children: ReactNode }) => {
  return (
    <ErrorBoundary fallbackRender={fallbackRender} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
};
