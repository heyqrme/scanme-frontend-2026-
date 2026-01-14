import type {
  HMRPayload,
  HmrContext,
  ModuleNode,
  Plugin,
  ViteDevServer,
} from "vite";
import {
  type HotUpdatePayload,
  type ModuleProps,
  type ModuleRef,
  publishBuildEnded,
  publishBuildStarted,
  publishHotUpdate,
  publishServerConfigured,
  publishUiError,
  publishUiUpdated,
} from "./devx-publish";
import {
  type ErrorBoundaryPayload,
  formatError,
  parseBoundaryErrorDescription,
  parseReactErrorDescription,
  parseViteErrorDescription,
} from "./exceptions";

const extractModuleRefProps = (mod: ModuleNode): ModuleRef => {
  return {
    id: mod.id,
    file: mod.file,
    url: mod.url,
    type: mod.type,
  };
};

const _extractModuleProps = (mod: ModuleNode): ModuleProps => {
  const ref = extractModuleRefProps(mod);

  const imports = Array.from(mod.importedModules.values()).map((imp) =>
    extractModuleRefProps(imp),
  );

  return {
    ref,
    imports,
    exports: mod.info?.exports ?? null,
    hasDefaultExport: mod.info?.hasDefaultExport ?? null,
  };
};

const parseIntoHotUpdatePayload = (ctx: HmrContext): HotUpdatePayload => {
  // Note: ctx contains a _lot_ more information if we need it
  return {
    file: ctx.file,
    timestamp: ctx.timestamp,
    // Disabled to avoid the cost, this contains e.g. what the file exports and imports
    // modules: ctx.modules.map(extractModuleProps),
  };
};

// This is a highly experimental plugin that's an attempt to report hot reloading
// events to devx which can forward it to the connected web clients.
export const hotReloadTrackerPlugin = (): Plugin => {
  // TODO: When no preview client is connected, many errors are not detected.
  // We can implement extra validation or compilation step after successful updates here.
  // Or simply run tsc from agent after all files are updated.

  return {
    name: "hot-reload-tracker",
    async buildStart() {
      console.info("hot-reload-tracker: Build starting");
      await publishBuildStarted({});
    },
    async buildEnd(error?: Error) {
      if (error) {
        console.warn("hot-reload-tracker: build error = ", formatError(error));
      } else {
        console.info("hot-reload-tracker: build success");
      }
      await publishBuildEnded({
        error: error ? parseReactErrorDescription(error) : null,
      });
    },
    async handleHotUpdate(ctx: HmrContext) {
      // Ignore updates to tsserver.log, happens a lot
      if (ctx.file.endsWith(".log")) {
        return;
      }

      // This means the vite file watcher has detected a change to a file
      console.debug(`hot-reload-tracker: hot-update, file = ${ctx.file}`);
      await publishHotUpdate(parseIntoHotUpdatePayload(ctx));

      // Race safe file reading for debugging:
      // console.debug("Hot reloading file contents for file = ${ctx.file}:", ctx.read());

      // Note: We can skip or shape hotreloading behaviour by returning stuff here
    },
    async configureServer(server: ViteDevServer) {
      // Wrap the send method to catch error messages sent from vite to client,
      // this includes at least syntax errors and maybe some other transform/load errors
      const originalSend = server.ws.send.bind(server.ws);
      server.ws.send = (payload: HMRPayload) => {
        if (payload.type === "error") {
          // If processing fail, the server sends errors to the clients and do not send an update (I think)
          // Note: This is async
          publishUiError({
            source: "server",
            error: parseViteErrorDescription(payload),
          });
          console.warn(
            "hot-reload-tracker: vite-error, server reported error payload =",
            payload,
          );
        } else if (payload.type === "update") {
          // The server sends updated files to the clients if processing didn't fail
          const serverUpdatedFiles = payload.updates
            .filter((it) => it.type === "js-update")
            .map((update) => update.path);
          // Note: This is async
          publishUiUpdated({
            source: "server",
            files: serverUpdatedFiles,
          });
          console.debug(
            `hot-reload-tracker: server updated files = ${serverUpdatedFiles}`,
          );
        }

        return originalSend(payload);
      };

      // Catch custom event from reportErrorToServerPlugin
      server.ws.on(
        "custom:error-boundary",
        (data: { event: string; payload: ErrorBoundaryPayload }) => {
          try {
            const { event, payload } = data;

            if (event === "react-error") {
              // TODO: payload contains more details we're not using here
              // Note: This is async
              publishUiError({
                // Note: Just reusing the same ui error as if we got this from vite:error
                source: "client",
                error: parseBoundaryErrorDescription(payload),
              });

              console.debug(
                "hot-reload-tracker: react-error, client reported error payload =",
                payload,
              );
            } else {
              console.warn(
                "hot-reload-tracker: error-boundary, unhandled event =",
                event,
              );
            }
          } catch (e) {
            console.error("hot-reload-tracker: error-boundary, error =", e);
          }
        },
      );

      // Catch custom event sent from hook in useHMR.ts
      // Note: May be called from multiple clients!
      server.ws.on(
        "custom:hmr-event-from-client",
        (data: { event: string; payload: HMRPayload }) => {
          try {
            const { event, payload } = data;

            if (event === "vite-error" && payload.type === "error") {
              // Note: This is async
              publishUiError({
                source: "client",
                error: parseViteErrorDescription(payload),
              });
              console.warn(
                "hot-reload-tracker: vite-error, client reported error payload =",
                payload,
              );
            } else if (
              event === "vite-after-update" &&
              payload.type === "update"
            ) {
              const clientUpdatedFiles = payload.updates
                .filter((it) => it.type === "js-update")
                .map((update) => update.path);
              // Now we know that at least one connected client has reloaded paths in updatedPathsFromClient
              publishUiUpdated({
                source: "client",
                files: clientUpdatedFiles,
              });
              console.debug(
                `hot-reload-tracker: vite-after-update, client updated files = ${clientUpdatedFiles}`,
              );
            } else {
              console.warn(
                "hot-reload-tracker: hmr-event-from-client, unhandled event =",
                event,
              );
            }
          } catch (e) {
            console.error(
              "hot-reload-tracker: hmr-event-from-client, error =",
              e,
            );
          }
        },
      );

      // Listen for transform/load errors during HMR
      // TODO: Anything interesting we can catch here?
      // This is called for every file that is loaded
      // server.middlewares.use((req, res, next) => {
      //   console.log("hot-reload-tracker: Request:", req.url);
      //   const originalJson = res.json?.bind(res);
      //   res.json = (data) => {
      //     if (data?.error) {
      //       console.error("hot-reload-tracker: Transform error:", data.error);
      //       // publishTransformError(data.error);
      //     }
      //     return originalJson?.(data) ?? res.end(JSON.stringify(data));
      //   };
      //   next();
      // });

      // Let devx (and by extension the connected clients)
      // know the vite server is ready (is this the best place to send a signal from?)
      // Return as function to hun after internal vite middlewares,
      // as close as possible to when vite server is actually ready:
      return async () => {
        await publishServerConfigured();
      };
    },
  };
};
