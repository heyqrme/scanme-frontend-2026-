const localDevxUrl = (path: string) => {
  const devxPort = process.env.DEVX_API_PORT || "8008";
  return `http://localhost:${devxPort}${path}`;
};

export interface UiErrorDescription {
  name: string;
  message: string;
  stack: string | null;
}

export const publishServerConfigured = async (): Promise<void> => {
  try {
    const url = localDevxUrl("/workspace/internal/ui/server-configured");
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{}",
    });
  } catch (error) {
    console.error("Failed to report server configured to devx", error);
  }
};

// biome-ignore lint/suspicious/noEmptyInterface: just a placeholder
export interface BuildStartedPayload {}

export const publishBuildStarted = async (
  payload: BuildStartedPayload,
): Promise<void> => {
  try {
    const url = localDevxUrl("/workspace/internal/ui/build-started");
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Failed to report build start to devx", error);
  }
};

export interface BuildEndedPayload {
  error: UiErrorDescription | null;
}

export const publishBuildEnded = async (
  payload: BuildEndedPayload,
): Promise<void> => {
  try {
    const url = localDevxUrl("/workspace/internal/ui/build-ended");
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Failed to report build end to devx", error);
  }
};

export interface ModuleRef {
  id: string | null;
  file: string | null;
  url: string;
  type: "js" | "css";
}

export interface ModuleProps {
  ref: ModuleRef;
  imports: Array<ModuleRef>;
  exports: string[] | null;
  hasDefaultExport: boolean | null;
}

export interface HotUpdatePayload {
  file: string;
  timestamp: number;
  // modules: Array<ModuleProps>;
}

export const publishHotUpdate = async (
  payload: HotUpdatePayload,
): Promise<void> => {
  try {
    const url = localDevxUrl("/workspace/internal/ui/hot-update");
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Failed to report hot reload status to devx", error);
  }
};

export interface UiErrorPayload {
  source: "client" | "server";
  error: UiErrorDescription;
}

export const publishUiError = async (
  payload: UiErrorPayload,
): Promise<void> => {
  try {
    const url = localDevxUrl("/workspace/internal/ui/error");
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Failed to report ui error status to devx", error);
  }
};

export interface UiUpdatedPayload {
  source: "client" | "server";
  files: string[];
}

export const publishUiUpdated = async (
  payload: UiUpdatedPayload,
): Promise<void> => {
  try {
    const url = localDevxUrl("/workspace/internal/ui/updated");
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Failed to report ui update status to devx", error);
  }
};
