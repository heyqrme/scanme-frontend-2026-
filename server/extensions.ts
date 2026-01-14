export enum ExtensionName {
  FIREBASE_AUTH = "firebase-auth",
  STACK_AUTH = "stack-auth",
}

interface Extension {
  name: string;
  version: string;
  config: Record<string, unknown>;
}

const listExtensions = (): Extension[] => {
  if (process.env.DATABUTTON_EXTENSIONS) {
    try {
      return JSON.parse(process.env.DATABUTTON_EXTENSIONS) as [
        {
          name: string;
          version: string;
          config: Record<string, unknown>;
        },
      ];
    } catch (err: unknown) {
      console.error("Error parsing DATABUTTON_EXTENSIONS", err);
      console.error(process.env.DATABUTTON_EXTENSIONS);
      return [];
    }
  }

  return [];
};

const initExtensions = (): Extension[] => {
  const extensions = listExtensions();

  if (extensions.length === 0) {
    console.log("No extensions found");
    return [];
  }

  console.log(`Found ${extensions.length} extensions`);
  for (const extension of extensions) {
    console.log(`- ${extension.name} (${extension.version})`);
  }

  return extensions;
};

const extensions = initExtensions();

export const isExtensionEnabled = (extensionName: ExtensionName): boolean => {
  return extensions.some((extension) => extension.name === extensionName);
};

export const getExtensionConfig = (
  extensionName: ExtensionName,
): Record<string, unknown> => {
  if (extensions.length === 0) {
    throw new Error(`No extensions found looking for ${extensionName}`);
  }

  const extension = extensions.find(
    (extension) => extension.name === extensionName,
  );

  if (!extension) {
    throw new Error(`Extension ${extensionName} not found`);
  }

  return extension.config;
};
