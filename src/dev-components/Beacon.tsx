import type { ReactNode } from "react";
import { useBeacon } from "../internal-hooks/useBeacon";
import { useHMR } from "../internal-hooks/useHMR";
import { usePageChangeListener } from "../internal-hooks/usePageChangeListener";

interface Props {
  children: ReactNode;
}

export const MessageEmitter = ({ children }: Props) => {
  // Emit beacons to parent
  useBeacon({ source: "message-emitter" });

  // Emit HMR events to parent
  useHMR();

  // Emit page change events to parent
  usePageChangeListener();

  return <>{children}</>;
};
