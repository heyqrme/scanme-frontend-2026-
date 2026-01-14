import { AppProvider } from "components/AppProvider";
import { Outlet, createBrowserRouter } from "react-router-dom";
import {
  APP_BASE_PATH,
  APP_DEPLOY_APPNAME,
  APP_DEPLOY_CUSTOM_DOMAIN,
  APP_DEPLOY_USERNAME,
  Mode,
  mode,
} from "./constants";
import { DevTools } from "./internal-components/DevTools";
import NotFoundPage from "./pages/NotFoundPage";
import SomethingWentWrongPage from "./pages/SomethingWentWrongPage";
import { SuspenseWrapper } from "./prod-components/SuspenseWrapper";
import { userRoutes } from "./user-routes";

const APP_DEPLOY_ROOT_DOMAIN = "riff.works";

export const appBasePath = (): string => {
  const origin = window.location.hostname;

  if (APP_DEPLOY_CUSTOM_DOMAIN && origin === APP_DEPLOY_CUSTOM_DOMAIN) {
    return "/";
  }

  if (
    APP_DEPLOY_USERNAME &&
    APP_DEPLOY_APPNAME &&
    origin === `${APP_DEPLOY_USERNAME}.${APP_DEPLOY_ROOT_DOMAIN}`
  ) {
    return `/${APP_DEPLOY_APPNAME}`;
  }

  return APP_BASE_PATH;
};

export const router = createBrowserRouter(
  [
    {
      element: (
        <DevTools shouldRender={mode === Mode.DEV}>
          <AppProvider>
            <SuspenseWrapper>
              <Outlet />
            </SuspenseWrapper>
          </AppProvider>
        </DevTools>
      ),
      children: userRoutes,
    },
    {
      path: "*",
      element: (
        <SuspenseWrapper>
          <NotFoundPage />
        </SuspenseWrapper>
      ),
      errorElement: (
        <SuspenseWrapper>
          <SomethingWentWrongPage />
        </SuspenseWrapper>
      ),
    },
  ],
  {
    basename: appBasePath(),
  },
);
