import type { ReactNode } from "react";
import { useBeacon } from "../internal-hooks/useBeacon";

interface Props {
  text: ReactNode;
  canRefresh: boolean;
}

export const DevErrorPage = ({ text, canRefresh }: Props) => {
  useBeacon({ source: "error-page" });

  return (
    <div
      style={{
        display: "flex",
        flexFlow: "column",
        gap: "20px",
        padding: "20px",
      }}
    >
      {text}

      <div
        style={{
          display: "flex",
          gap: "10px",
        }}
      >
        {canRefresh && (
          <button
            style={{
              color: "blue",
              width: "fit-content",
            }}
            type="button"
            onClick={() => {
              window.location.reload();
            }}
          >
            Reload page
          </button>
        )}
      </div>
    </div>
  );
};
