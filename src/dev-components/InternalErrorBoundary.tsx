import * as Sentry from "@sentry/react";
import type { ErrorInfo, ReactNode } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { DevErrorPage } from "./DevErrorPage";
import { reportErrorToServerPlugin } from "./error-boundary-report";

interface Props {
  children: ReactNode;
}

const fallbackRender = (_props: FallbackProps) => {
  return (
    <DevErrorPage
      text="Something went wrong. Please retry or contact support."
      canRefresh={false}
    />
  );
};

const handleError = (error: Error, errorInfo: ErrorInfo) => {
  Sentry.captureException(error);
  reportErrorToServerPlugin(error, errorInfo);
};

export const InternalErrorBoundary = ({ children }: Props) => {
  return (
    <ErrorBoundary fallbackRender={fallbackRender} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
};
