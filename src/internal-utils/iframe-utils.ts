import * as Sentry from "@sentry/react";
import { isLocalDevMode } from "./app-utils";
import { sanitiseObjectForPosting } from "./cloning-utils";

export interface AppBeaconMessage {
  event: "app-beacon";
  payload?: {
    source: "error-page" | "message-emitter";
  };
}

// Subset of standard Location
export interface PageLocation {
  pathname: string;
  hash: string;
  search: string;
}

export interface AppPageChangeMessage {
  event: "app-pagechange";
  payload: {
    timestamp: number;
    location: PageLocation;
  };
}

export interface ViteHotReloadMessage {
  event:
    | "vite-before-update"
    | "vite-after-update"
    | "vite-before-prune"
    | "vite-before-full-reload"
    | "vite-error"
    | "vite-invalidate"
    | "vite-ws-connect"
    | "vite-ws-disconnect";

  // Payload types forwarded from vite,
  // use payload.type to distinguish
  // and see import.meta.hot.on for more info
  payload?: object;
}

export type MessageToParent =
  | AppBeaconMessage
  | AppPageChangeMessage
  | ViteHotReloadMessage;

export const sendMessageToParent = (data: MessageToParent): void => {
  if (isLocalDevMode) {
    console.log(data);
  } else {
    try {
      window.parent.postMessage(
        sanitiseObjectForPosting(data),
        window.location.origin,
      );
    } catch (e: unknown) {
      console.error(e);
      Sentry.captureException(e);
    }
  }
};
