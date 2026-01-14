import { writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import getRawBody from "raw-body";
import { type ParsedRoute, generateApi } from "swagger-typescript-api";
import type { Connect } from "vite";

type Spec = import("swagger-schema-official").Spec & {
  servers: { url: string }[];
};

// Client name used for API class name and directory
const CLIENT_NAME = "apiclient";

export const createClient = async (
  signature: string,
  spec: Spec,
  config: {
    authExtensionEnabled: boolean;
  },
) => {
  const templatesDir = path.resolve(process.cwd(), "./templates");

  console.log(
    `Generating client code from OpenAPI spec with signature ${signature}`,
  );

  const { files } = await generateApi({
    spec,
    output: false,
    cleanOutput: false,
    httpClientType: "fetch",
    templates: templatesDir,
    modular: true,
    extractRequestBody: true,
    extractRequestParams: true,
    extractResponseBody: true,
    extractResponseError: true,
    generateRouteTypes: true,
    hooks: {
      onPrepareConfig: (initialConfig) => {
        return {
          ...initialConfig,
          config: {
            ...initialConfig.config,
            apiClassName: CLIENT_NAME,
            authExtensionEnabled: config.authExtensionEnabled,
          },
        };
      },
      onCreateRoute: (routeData) => {
        return {
          ...routeData,
          // Set name of generated client including files
          // This will be used as apiClassName in this template:
          // https://github.com/acacode/swagger-typescript-api/blob/master/templates/default/api.ejs#L39
          namespace: CLIENT_NAME,
        } satisfies ParsedRoute;
      },
      onFormatRouteName: (routeNameInfo) => {
        // Custom operationId is selected in backend app.internal.main,
        // this becomes the name of the api client methods the user calls
        return routeNameInfo.operationId;
      },
    },
    extraTemplates: [
      {
        name: "index.ts",
        path: `${templatesDir}/extra/index.ejs`,
      },
    ],
  });

  for (const file of files) {
    writeFileSync(
      path.resolve(
        process.cwd(),
        `./src/apiclient/${file.fileName}${file.fileExtension}`,
      ),
      file.fileContent,
    );
  }

  return JSON.stringify({ files });
};

export const buildOpenApiSpecHandler =
  (config: {
    authExtensionEnabled: boolean;
  }) =>
  async (
    req: Connect.IncomingMessage,
    res: ServerResponse<IncomingMessage>,
    next: Connect.NextFunction,
  ) => {
    if (req.method === "POST") {
      try {
        const raw = await getRawBody(req);
        const { signature, content } = JSON.parse(raw.toString());
        const clients = await createClient(signature, content, config);
        res.end(clients);
      } catch (err) {
        console.log(err);
        res.statusCode = 500;
        res.end("Error writing to file");
      }
    } else {
      next();
    }
  };
