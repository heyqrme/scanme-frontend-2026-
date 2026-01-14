import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import type {
  AppPageChangeMessage,
  PageLocation,
} from "../internal-utils/iframe-utils";
import { sendMessageToParent } from "../internal-utils/iframe-utils";

const emitPageChange = (location: PageLocation) => {
  sendMessageToParent({
    event: "app-pagechange",
    payload: {
      timestamp: new Date().getTime(),
      location,
    },
  } satisfies AppPageChangeMessage);
};

export const usePageChangeListener = () => {
  const location = useLocation();

  useEffect(() => {
    emitPageChange({
      pathname: location.pathname,
      hash: location.hash,
      search: location.search,
    });
  }, [location]);
};
