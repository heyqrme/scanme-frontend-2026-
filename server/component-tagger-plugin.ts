import path from "node:path";
import { parse } from "@babel/parser";
import type {
  Node as BabelNode,
  JSXAttribute,
  JSXIdentifier,
  JSXMemberExpression,
  JSXOpeningElement,
} from "@babel/types";
import type { Node as ESTreeNode } from "estree";
import { walk } from "estree-walker";
import MagicString from "magic-string";
import type { Plugin } from "vite";

const VALID_EXTENSIONS = new Set([".tsx", ".jsx"]);

const TAG_NAME = "data-dbtn-component-id";

// checks for .../components/... or .../pages/...
const COMPONENT_PATH_REGEX = /(?:^|[/\\])(?:src[/\\])?(components|pages)\/\w+$/;

const ABS_PATH_COMPONENT_REGEX = /src\/(components|pages)\/\w+\.[t|j]sx$/;

interface ImportMap {
  [localName: string]: string; // local identifier: source string from import statement
}

const HTML_ELEMENTS = new Set([
  // Document metadata
  "html",
  "head",
  "title",
  "base",
  "link",
  "meta",
  "style",
  "script",
  "noscript",

  // Sectioning
  "header",
  "nav",
  "main",
  "section",
  "article",
  "aside",
  "footer",
  "address",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",

  // Grouping content
  "p",
  "hr",
  "pre",
  "blockquote",
  "ol",
  "ul",
  "li",
  "dl",
  "dt",
  "dd",
  "figure",
  "figcaption",
  "div",

  // Text-level semantics
  "a",
  "em",
  "strong",
  "small",
  "s",
  "cite",
  "q",
  "dfn",
  "abbr",
  "time",
  "code",
  "var",
  "samp",
  "kbd",
  "sub",
  "sup",
  "i",
  "b",
  "u",
  "mark",
  "ruby",
  "rt",
  "rp",
  "bdi",
  "bdo",
  "span",
  "br",
  "wbr",
  "data",

  // Edits
  "ins",
  "del",

  // Embedded content
  "img",
  "iframe",
  "embed",
  "object",
  "param",
  "video",
  "audio",
  "track",
  "map",
  "area",
  "picture",
  "source",
  "canvas",

  // Table content
  "table",
  "caption",
  "colgroup",
  "col",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",

  // Forms
  "form",
  "fieldset",
  "legend",
  "label",
  "input",
  "button",
  "select",
  "datalist",
  "optgroup",
  "option",
  "textarea",
  "output",
  "progress",
  "meter",

  // Interactive elements
  "details",
  "summary",
  "dialog",
  "menu",

  // Web Components
  "template",
  "slot",
]);

// checks if the import is from components/pages
// this is the import part and thus without file extension and can contain alias ('@/components/button')
function isUserComponentImport(sourcePath: string): boolean {
  const normalised = sourcePath.split("/").join(path.sep);
  return COMPONENT_PATH_REGEX.test(normalised);
}

// checks if the file is in components/pages
// input here is absolute path
function isComponentFile(id: string): boolean {
  return ABS_PATH_COMPONENT_REGEX.test(id.split("/").join(path.sep));
}

function isHTMLElement(name: string): boolean {
  return HTML_ELEMENTS.has(name);
}

export function componentTaggerPlugin(): Plugin {
  return {
    name: "vite-plugin-dbtn-component-tagger",
    enforce: "pre",
    // the code is the raw code
    // the id is the path to the file
    transform(code, id) {
      try {
        if (id.includes("node_modules")) {
          return null; // skip if file is in node_modules
        }
        if (!VALID_EXTENSIONS.has(path.extname(id))) {
          return null; // skip if file does not end in .tsx or .jsx
        }
        if (code.includes(TAG_NAME)) {
          return null; // skip if we somehow have already tagged this file
        }

        let ast: ReturnType<typeof parse>;
        ast = parse(code, {
          sourceType: "module",
          plugins: ["jsx", "typescript"],
          allowUndeclaredExports: true,
        });

        const importMap: ImportMap = {};
        // for each child of the current file/ast
        for (const node of ast.program.body) {
          // parse import statements
          if (node.type === "ImportDeclaration") {
            const source: string = node.source.value;
            // storing where each imported component is from along with the local name of the component
            // ie. specs are button and container in `import { Button, Container } from "components/Button"`
            for (const spec of node.specifiers) {
              const localName = spec.local.name;
              importMap[localName] = source;
            }
          }
        }

        // collect imports from pages/components directories
        // maps from local name to source path
        // qualified if the file has an import from components/pages
        const qualifyingNames = new Set<string>();
        for (const [local, source] of Object.entries(importMap)) {
          if (isUserComponentImport(source)) {
            qualifyingNames.add(local);
          }
        }

        // skip if the file itself is not a component file and there are no imports from components/pages directories
        if (!isComponentFile(id) && qualifyingNames.size === 0) {
          return null;
        }

        // temporarily store the code in a magic string
        // ms shifts the code to the right by the amount of characters we inject so that the sourcemap is correct
        const ms = new MagicString(code);

        let mutated = false;

        // use an AST parser and paste the content of a file to view the AST
        walk(ast as unknown as ESTreeNode, {
          // enter is a callback that is called for each node in the AST
          enter(node: unknown) {
            const n = node as BabelNode;
            // tag wrappers
            if (n.type !== "JSXOpeningElement") {
              return;
            }

            const jsxNode = n as JSXOpeningElement;

            let elementName: string | undefined;

            if (jsxNode.name.type === "JSXIdentifier") {
              elementName = jsxNode.name.name; // ie. "div"
            } else if (jsxNode.name.type === "JSXMemberExpression") {
              // identify the leftmost identifier in a member expression ie foo.bar.baz -> foo
              // root can be jsxIdentifier if it's the leftmost identifier of the expression
              let root: JSXIdentifier | JSXMemberExpression =
                jsxNode.name.object;
              while (root.type === "JSXMemberExpression") {
                root = root.object;
              }
              if (root.type === "JSXIdentifier") {
                elementName = root.name;
              }
            }

            // shouldn't happen, but if the name was undefined, skip
            if (!elementName) {
              return;
            }

            // decide whether to tag this element
            const shouldTag =
              qualifyingNames.has(elementName) || // if the current component is imported from components/pages dirs
              (isComponentFile(id) && isHTMLElement(elementName)); // if the current node is an HTML element in a pages/components dirs file

            if (!shouldTag) {
              return;
            }

            // shouldn't happen, but if the tag already exists on this element, skip
            const hasAttribute = jsxNode.attributes.some((attr) => {
              if (attr.type !== "JSXAttribute") return false;
              return (attr as JSXAttribute).name?.name === TAG_NAME;
            });
            if (hasAttribute) {
              return;
            }

            // build unique identifier based on import source + position in file
            const importSource =
              importMap[elementName] || path.relative(process.cwd(), id);
            const line = jsxNode.loc?.start.line ?? 0;
            const col = jsxNode.loc?.start.column ?? 0;
            const uniqueId = `${importSource}:${line}:${col}`;

            // generics are represented on the AST via the optional `typeParameters` property.
            // logging it, we see that it gives us the end index of the type parameters (if any)
            // if there are no type parameters, we insert the attribute after the element name
            const insertPos = (jsxNode.typeParameters?.end ??
              jsxNode.name.end ??
              jsxNode.start) as number;

            ms.appendLeft(insertPos, ` ${TAG_NAME}="${uniqueId}"`);
            mutated = true;
          },
        });

        if (!mutated) {
          // tells vite we didn't change the file
          return null;
        }

        return {
          code: ms.toString(), // modified code
          map: ms.generateMap({ hires: true }),
        };
      } catch (err) {
        this.warn?.(
          `[componentTagger] Error while processing ${id}: ${(err as Error).message}`,
        );
        return null; // if there's an error, skip the plugin for this file
      }
    },
  };
}
