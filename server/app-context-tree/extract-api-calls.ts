import { type CallExpression, type ImportDeclaration, Node } from "ts-morph";

/** API client import patterns */
const API_CLIENT_PATTERNS = [
  /apiclient/i,
  /api[_-]?client/i,
  /utils\/api/,
  /@\/apiclient/,
];

/**
 * Check if an import is an API client import.
 */
function isApiClientImport(moduleSpecifier: string): {
  isApiClient: boolean;
  isAppImport: boolean;
} {
  const isAppImport = moduleSpecifier === "app";
  const isBrainImport = moduleSpecifier === "brain";
  const isApiClientPathImport = API_CLIENT_PATTERNS.some((pattern) =>
    pattern.test(moduleSpecifier),
  );

  return {
    isApiClient: isAppImport || isBrainImport || isApiClientPathImport,
    isAppImport,
  };
}

/**
 * Collect API client import identifiers from an import declaration.
 * Returns the set of identifiers that represent API clients.
 */
export function collectApiClientImport(
  node: ImportDeclaration,
): Set<string> | null {
  const moduleSpecifier = node.getModuleSpecifierValue();
  const { isApiClient, isAppImport } = isApiClientImport(moduleSpecifier);

  if (!isApiClient) {
    return null;
  }

  const identifiers = new Set<string>();

  const defaultImport = node.getDefaultImport();
  if (defaultImport) {
    identifiers.add(defaultImport.getText());
  }

  const namedImports = node.getNamedImports();
  for (const spec of namedImports) {
    const importName = spec.getName();
    const alias = spec.getAliasNode()?.getText() || importName;

    if (isAppImport) {
      // For "app" imports, only add if it looks like an API client
      const lowerName = importName.toLowerCase();
      if (
        lowerName === "apiclient" ||
        lowerName === "api_client" ||
        (lowerName.startsWith("api") && lowerName.includes("client"))
      ) {
        identifiers.add(alias);
      }
    } else {
      identifiers.add(alias);
    }
  }

  const namespaceImport = node.getNamespaceImport();
  if (namespaceImport) {
    identifiers.add(namespaceImport.getText());
  }

  return identifiers.size > 0 ? identifiers : null;
}

/**
 * Extract API method call from a call expression.
 * Returns the method name if this is an API client call, null otherwise.
 */
export function processCallForApiCalls(
  node: CallExpression,
  apiClientImports: Set<string>,
): string | null {
  const expression = node.getExpression();

  if (!Node.isPropertyAccessExpression(expression)) {
    return null;
  }

  const object = expression.getExpression();
  const propertyName = expression.getName();

  if (Node.isIdentifier(object)) {
    const objectName = object.getText();
    if (apiClientImports.has(objectName)) {
      return propertyName;
    }
  } else if (Node.isPropertyAccessExpression(object)) {
    const chainedObject = object.getExpression();
    if (Node.isIdentifier(chainedObject)) {
      const chainedName = chainedObject.getText();
      if (apiClientImports.has(chainedName)) {
        return propertyName;
      }
    }
  }

  return null;
}
