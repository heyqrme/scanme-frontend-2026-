import type { ErrorInfo } from "react";

export const reportErrorToServerPlugin = (
  error: Error,
  errorInfo: ErrorInfo,
) => {
  if (import.meta.hot) {
    // Listened to in our hot-reload-tracker plugin
    import.meta.hot.send("custom:error-boundary", {
      event: "react-error",
      payload: {
        name: error.name,
        message: error.message,
        componentStack: errorInfo.componentStack,
        // stack contains "name: message\ncomponentStack"
        stack: error.stack,
        digest: errorInfo.digest,
      },
    });
  }
};
