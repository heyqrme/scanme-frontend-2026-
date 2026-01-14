import react from "@vitejs/plugin-react-swc";
import "dotenv/config";
import path from "node:path";
import { defineConfig, splitVendorChunkPlugin, type Plugin } from "vite";
import injectHTML from "vite-plugin-html-inject";
import tsConfigPaths from "vite-tsconfig-paths";
import { componentTaggerPlugin } from "./server/component-tagger-plugin";
import {
  ExtensionName,
  getExtensionConfig,
  isExtensionEnabled,
} from "./server/extensions";
import { hotReloadTrackerPlugin } from "./server/hotreload-tracker";
import { createRiffLogger } from "./server/logger";
import { buildOpenApiSpecHandler } from "./server/openapi-spec-handler";
import { handleTryTscCompile } from "./server/try-tsc-handler";

const isDevRun = process.env.NODE_ENV === "development";

const enableHotReloadTracker = false; // Disabled for local development to avoid crashes

const projectId = process.env.DATABUTTON_PROJECT_ID || "MISSING-PROJECT-ID";
const serviceType = process.env.DATABUTTON_SERVICE_TYPE || "devx"; // Always devx actually

// External host+path prefix to devx container root
const devxHost =
  process.env.DEVX_HOST ||
  `https://${process.env.APP_VARIANT === "riff" ? "api.riff.new" : "api.databutton.com"}`;
// Note: During build DEVX_BASE_PATH is set with devx replaced with prodx
const devxBasePath =
  process.env.DEVX_BASE_PATH || `/_projects/${projectId}/dbtn/${serviceType}`;

// Caddy does: handle_path /ui/* { rewrite * {$DEVX_BASE_PATH}/ui{path}; ... }
// meaning browser hits (host)/{$DEVX_BASE_PATH}/ui/ to reach vite server.
// If APP_BASE_PATH is set, use it as override, otherwise use DEVX_BASE_PATH + /ui combination
// For local standalone dev and Firebase production, use root path
const APP_BASE_PATH = '/';

// API_HOST is typically https://api.databutton.com or https://api.riff.new or https://custom-domain.com or http://localhost:8501
const API_HOST = process.env.API_HOST || devxHost;

// API path is the path (not including host) to the user app api server.
// If running in production, use the prod API path,
// otherwise use the dev API path, e.g.:
// /_projects/${projectId}/dbtn/prodx/app/routes
// /_projects/${projectId}/dbtn/devx/app/routes
const API_PATH = process.env.API_PATH || `${devxBasePath}/app/routes`;

// API_PREFIX_PATH is set in build_router.py to from the apiBasePath parameter in the build endpoint
// which is called from db-api which is called from firebase.
// It is set to /api for custom domains or .../prodx/app for default deployments.
const API_PREFIX_PATH = process.env.API_PREFIX_PATH || API_PATH; // Same as API_PATH now?

// Full urls to reach the user app backend apis at via our proxy, not for other deployed domains!
// API HTTP endpoints should be reachable at `${API_URL}/endpointname`
const API_URL = `${API_HOST}${API_PATH}`;
// API websocket endpoints should be reachable at `${WS_API_URL}/endpointname`
const WS_API_URL = API_URL.replace("http", "ws");

if (isDevRun) {
  console.warn(`

    Input Vite env:

      DEVX_HOST=${process.env.DEVX_HOST}
      DEVX_BASE_PATH=${process.env.DEVX_BASE_PATH}
      APP_BASE_PATH=${process.env.APP_BASE_PATH}
      API_HOST=${process.env.API_HOST}
      API_PATH=${process.env.API_PATH}
      API_PREFIX_PATH=${process.env.API_PREFIX_PATH}
      API_URL=${process.env.API_URL}
      WS_API_URL=${process.env.WS_API_URL}

    Resolved Vite config:

      devxHost=${devxHost}
      devxBasePath=${devxBasePath}
      APP_BASE_PATH=${APP_BASE_PATH}
      API_HOST=${API_HOST}
      API_PATH=${API_PATH}
      API_PREFIX_PATH=${API_PREFIX_PATH}
      API_URL=${API_URL}
      WS_API_URL=${WS_API_URL}

`);
}

const coalesce = (...args: (string | undefined)[]): string => {
  for (const s of args) {
    if (s) {
      return s;
    }
  }
  throw new Error("All values are falsy.");
};

const APP_TITLE = coalesce(
  process.env.APP_TITLE,
  process.env.DATABUTTON_APPNAME,
  "Riff",
);

const APP_FAVICON_LIGHT = coalesce(
  process.env.APP_FAVICON_LIGHT,
  process.env.APP_FAVICON_DARK,
  `${APP_BASE_PATH}/icon.png`.replace("//", "/"),
);

const APP_FAVICON_DARK = coalesce(
  process.env.APP_FAVICON_DARK,
  process.env.APP_FAVICON_LIGHT,
  `${APP_BASE_PATH}/icon.png`.replace("//", "/"),
);

const htmlPlugin = () => {
  return {
    name: "html-transform",
    transformIndexHtml(html: string) {
      let newHtml = html;

      if (APP_TITLE) {
        newHtml = newHtml.replace(
          /<title>(.*?)<\/title>/,
          `<title>${APP_TITLE}</title>`,
        );
      }

      if (APP_FAVICON_LIGHT) {
        newHtml = newHtml.replace(
          /href="(.*?)\/light.ico"/,
          `href="${APP_FAVICON_LIGHT}"`,
        );
      }

      if (APP_FAVICON_DARK) {
        newHtml = newHtml.replace(
          /href="(.*?)\/dark.ico"/,
          `href="${APP_FAVICON_DARK}"`,
        );
      }

      return newHtml;
    },
  };
};

const isFirebaseAuthExtensionEnabled = isExtensionEnabled(
  ExtensionName.FIREBASE_AUTH,
);

const isStackAuthExtensionEnabled = isExtensionEnabled(
  ExtensionName.STACK_AUTH,
);

const authExtensionEnabled =
  isFirebaseAuthExtensionEnabled || isStackAuthExtensionEnabled;

const uiDevServerPlugin = (): Plugin => {
  // Disabled for standalone/local development
  return {
    name: "vite-server",
    configureServer(server) {
      // API handlers disabled for local dev
    },
  };
};

const allDefines: {
  __APP_ID__: string;
  __API_HOST__: string;
  __API_PREFIX_PATH__: string;
  __API_PATH__: string;
  __API_URL__: string;
  __WS_API_URL__: string;
  __APP_BASE_PATH__: string;
  __APP_TITLE__: string;
  __APP_FAVICON_LIGHT__: string;
  __APP_FAVICON_DARK__: string;
  __APP_DEPLOY_USERNAME__: string;
  __APP_DEPLOY_APPNAME__: string;
  __APP_DEPLOY_CUSTOM_DOMAIN__: string;
  __FIREBASE_CONFIG__?: string;
  __STACK_AUTH_CONFIG__?: string;
} = {
  // This used to be a bit complex, I've made an attempt at normalization of the variables.
  // Scenario: devx runs dockerfile directly
  // API_HOST = http://localhost:8080
  // API_PATH = /app/routes

  // Scenario: localhost for testing behind webclient vite proxy
  // API_HOST = http://localhost:8501
  // API_PATH = /_projects/$DATABUTTON_PROJECT_ID/dbtn/$DATABUTTON_SERVICE_TYPE/app/routes

  // Scenario: deployed app on custom-domain.com/api
  // API_HOST = https://custom-domain.com
  // API_PATH = /api

  // Scenario: deployed app on username.riff.works/appname/api
  // API_HOST = https://username.riff.works
  // API_PATH = /appname/api

  // Scenario: devx or prodx service behind api.databutton.com-like proxy
  // API_HOST = https://api.riff.new
  // API_PATH = /_projects/$DATABUTTON_PROJECT_ID/dbtn/$DATABUTTON_SERVICE_TYPE/app/routes

  __APP_ID__: JSON.stringify(projectId),
  __API_HOST__: JSON.stringify(API_HOST),
  __API_PREFIX_PATH__: JSON.stringify(API_PREFIX_PATH),
  //
  __API_PATH__: JSON.stringify(API_PATH), // .../app
  __API_URL__: JSON.stringify(API_URL), // .../app/routes
  __WS_API_URL__: JSON.stringify(WS_API_URL), // wss://.../app/routes
  //
  __APP_BASE_PATH__: JSON.stringify(APP_BASE_PATH),
  //
  __APP_TITLE__: JSON.stringify(APP_TITLE),
  __APP_FAVICON_LIGHT__: JSON.stringify(APP_FAVICON_LIGHT),
  __APP_FAVICON_DARK__: JSON.stringify(APP_FAVICON_DARK),
  //
  __APP_DEPLOY_USERNAME__: JSON.stringify(process.env.DATABUTTON_USERNAME),
  __APP_DEPLOY_APPNAME__: JSON.stringify(process.env.DATABUTTON_APPNAME),
  __APP_DEPLOY_CUSTOM_DOMAIN__: JSON.stringify(
    process.env.DATABUTTON_CUSTOM_DOMAIN,
  ),
};

if (isFirebaseAuthExtensionEnabled) {
  allDefines.__FIREBASE_CONFIG__ = JSON.stringify(
    JSON.stringify(getExtensionConfig(ExtensionName.FIREBASE_AUTH)),
  );
} else {
  // Use QRConnect Firebase project for local development
  allDefines.__FIREBASE_CONFIG__ = JSON.stringify(JSON.stringify({
    signInOptions: {
      google: true,
      github: false,
      facebook: false,
      twitter: false,
      emailAndPassword: true,
      magicLink: false,
    },
    siteName: "ScanMe",
    signInSuccessUrl: "/",
    firebaseConfig: {
      apiKey: "AIzaSyD2t0vR_Wzg9ISgiede9Np8f8bs7T3Kp4s",
      authDomain: "studio-6205573390-be680.firebaseapp.com",
      projectId: "studio-6205573390-be680",
      storageBucket: "studio-6205573390-be680.firebasestorage.app",
      messagingSenderId: "1094681517949",
      appId: "1:1094681517949:web:522434cc25b8359fa1f614"
    }
  }));
}

if (isStackAuthExtensionEnabled) {
  allDefines.__STACK_AUTH_CONFIG__ = JSON.stringify(
    JSON.stringify(getExtensionConfig(ExtensionName.STACK_AUTH)),
  );
} else {
  // Define empty config when Stack auth is not enabled to avoid runtime errors
  allDefines.__STACK_AUTH_CONFIG__ = JSON.stringify(JSON.stringify({}));
}

export default defineConfig({
  base: APP_BASE_PATH,
  define: allDefines,
  plugins: [
    react(),
    splitVendorChunkPlugin(),
    tsConfigPaths(),
    htmlPlugin(),
    injectHTML(),
    // Disabled Databutton-specific plugins for local development
  ].filter(Boolean),
  server: {
    host: true, // Allow external connections (e.g., from phone)
    port: 5173,
    hmr: {
      overlay: false,
    },
    watch: {
      usePolling: true,
      interval: 200,
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/dist/**",
        "**/.log/**",
        "**/.cache/**",
        "**/.yarn/**",
      ],
    },
  },
  // Disabled custom logger for local development
  customLogger: undefined,
  // This looks weird but resolution of shadcn components don't work without this double nested resolve.alias.resolve.alias
  resolve: {
    alias: {
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "./src"),
        },
      },
    },
  },
});
