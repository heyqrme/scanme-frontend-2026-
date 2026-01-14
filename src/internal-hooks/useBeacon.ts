import { useCallback, useEffect } from "react";
import {
  type AppBeaconMessage,
  sendMessageToParent,
} from "../internal-utils/iframe-utils";

/**
 * Emits a beacon message every second to the parent iframe
 */
export const useBeacon = ({
  source,
}: {
  source: "error-page" | "message-emitter";
}) => {
  const emitBeacon = useCallback(() => {
    sendMessageToParent({
      event: "app-beacon",
      payload: {
        source,
      },
    } satisfies AppBeaconMessage);
  }, [source]);

  useEffect(() => {
    emitBeacon();

    const interval = setInterval(emitBeacon, 1_000);

    return () => {
      clearInterval(interval);
    };
  }, [emitBeacon]);
};
