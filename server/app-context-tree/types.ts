/**
 * TypeScript type definitions for App Context Tree.
 * These types must match the Pydantic models in devx-api/devx/app_context_tree/types.py
 * Field names, types, and nesting must align exactly for proper JSON serialization/deserialization.
 */

export interface PageNode {
  name: string;
  filepath: string;
  importedPages: string[];
  importedComponents: string[];
  apiClientCalls: string[];
  importedUiFiles: string[];
}

export interface ComponentNode {
  name: string;
  filepath: string;
  importedPages: string[];
  importedComponents: string[]; // Direct component imports
  apiClientCalls: string[]; // Direct API method calls
  importedUiFiles: string[]; // Direct UI file imports
}

export interface UiFileNode {
  name: string;
  filepath: string;
  importedPages: string[];
  importedComponents: string[]; // Direct component imports
  apiClientCalls: string[]; // Direct API method calls
  importedUiFiles: string[]; // Direct UI file imports
}

export interface ModuleNode {
  name: string;
  filepath: string;
}

export interface ApiNode {
  name: string;
  filepath: string;
}

export interface AppContextGraph {
  pages: PageNode[];
  components: ComponentNode[] | null;
  uiFiles: UiFileNode[] | null;
  apis: ApiNode[] | null;
  modules: ModuleNode[] | null;
}
