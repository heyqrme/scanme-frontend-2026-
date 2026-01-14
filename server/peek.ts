import * as path from "node:path";
import { type Identifier, Node, Project } from "ts-morph";

const MAX_VISIBLE_LINES = 20;

interface Location {
  startLineNumber: number;
  endLineNumber: number;
  filepath: string;
}

interface Peek {
  definitionNodeKind: string;
  peekText: string;
  snippet: string;
  location: Location;
}

export interface Result {
  snippet: string;
  location: Location;
  peeks: Peek[];
  config: {
    maxVisibleLinesInPeek: number;
  };
}

export function peekCodeReferences(
  filePath: string,
  fromLine: number,
  toLine: number,
): Result {
  // Create a new project
  const project = new Project({
    tsConfigFilePath: "./tsconfig.json",
    skipAddingFilesFromTsConfig: true,
  });

  // Add the source file
  const sourceFile = project.addSourceFileAtPath(filePath);

  const absoluteFilePath = path.resolve(process.cwd(), filePath);

  // Get the code snippet between the specified lines
  const fileContent = sourceFile.getFullText();
  const lines = fileContent.split("\n");
  const targetLines = lines.slice(fromLine - 1, toLine);
  const snippet = targetLines.join("\n");

  const peeks: Peek[] = [];

  // Track what we've already peeked at to avoid duplicates
  const peekedSet = new Set<string>();

  // Process all identifier nodes in the range
  sourceFile.forEachDescendant((node, traversal) => {
    // Check if the node is within our line range
    const nodeStartPos = node.getStart();
    const nodeEndPos = node.getEnd();

    const nodeStartLine = sourceFile.getLineAndColumnAtPos(nodeStartPos).line;
    const nodeEndLine = sourceFile.getLineAndColumnAtPos(nodeEndPos).line;

    if (nodeStartLine >= fromLine && nodeEndLine <= toLine) {
      // Handle identifiers that could be references to functions or constants
      if (Node.isIdentifier(node)) {
        const result = getDefinition({
          node,
          originalAbsFilepath: absoluteFilePath,
          readRange: {
            fromLine,
            toLine,
          },
        });
        if (!result) {
          return;
        }

        const peekKey = `${node.getFullText()}@${result.location.filepath}`;

        if (peekedSet.has(peekKey)) {
          return;
        }

        if (result) {
          peeks.push(result);

          peekedSet.add(peekKey);
        }
      }
    }

    // Don't traverse if we're outside the range
    if (nodeStartLine > toLine || nodeEndLine < fromLine) {
      traversal.skip();
    }
  });

  const endLineNumber = toLine > lines.length ? lines.length : toLine;

  // Return the result
  return mergeResult({
    snippet,
    location: {
      filepath: absoluteFilePath,
      startLineNumber: fromLine,
      endLineNumber,
    },
    peeks,
    config: {
      maxVisibleLinesInPeek: MAX_VISIBLE_LINES,
    },
  });
}

const getDefinition = ({
  node,
  originalAbsFilepath,
  readRange,
}: {
  originalAbsFilepath: string;
  readRange: {
    fromLine: number;
    toLine: number;
  };
  node: Identifier;
}): {
  definitionNodeKind: string;
  peekText: string;
  snippet: string;
  location: Location;
} | null => {
  try {
    const definitionNode = node.getDefinitionNodes()[0];

    if (Node.isNamespaceImport(definitionNode)) {
      return null;
    }

    const definitionSourceFilepath = definitionNode
      .getSourceFile()
      .getFilePath();

    if (definitionSourceFilepath.includes("node_modules")) {
      return null;
    }

    // If definition is within the read range, return null
    if (
      definitionSourceFilepath === originalAbsFilepath &&
      definitionNode.getStartLineNumber() >= readRange.fromLine &&
      definitionNode.getEndLineNumber() <= readRange.toLine
    ) {
      return null;
    }

    const snippet = definitionNode.getFullText();

    const snippetLines = snippet.split("\n");

    const declarationLength = snippetLines.length;

    const truncatedSnippet =
      declarationLength > MAX_VISIBLE_LINES
        ? snippetLines.slice(0, MAX_VISIBLE_LINES).join("\n")
        : snippet;

    const startLineNumber = definitionNode.getStartLineNumber();
    const endLineNumber =
      declarationLength > MAX_VISIBLE_LINES
        ? startLineNumber + MAX_VISIBLE_LINES
        : definitionNode.getEndLineNumber();

    return {
      definitionNodeKind: definitionNode.getKindName(),
      peekText: node.getFullText(),
      snippet: truncatedSnippet,
      location: {
        filepath: definitionNode.getSourceFile().getFilePath(),
        startLineNumber,
        endLineNumber,
      },
    };
  } catch (err) {
    return null;
  }
};

// Checks if two code snippets overlap completely or partially by comparing the start and end lines
const isCodeSnippetOverlapping = (params: {
  a: Location;
  b: Location;
}): boolean => {
  const { a, b } = params;

  // Check if either snippet is completely contained within the other
  const aContainsB =
    a.startLineNumber <= b.startLineNumber &&
    a.endLineNumber >= b.endLineNumber;
  const bContainsA =
    b.startLineNumber <= a.startLineNumber &&
    b.endLineNumber >= a.endLineNumber;

  // Check if snippets partially overlap
  const aOverlapsB =
    (a.startLineNumber <= b.startLineNumber &&
      a.endLineNumber >= b.startLineNumber) ||
    (a.startLineNumber <= b.endLineNumber &&
      a.endLineNumber >= b.endLineNumber);

  const isOverlapping = aContainsB || bContainsA || aOverlapsB;

  return isOverlapping;
};

// Merges two code snippets if they overlap
const mergeSnippets = (params: {
  a: { snippet: string; location: Location };
  b: { snippet: string; location: Location };
}): {
  snippet: string;
  location: Location;
} => {
  const { a, b } = params;

  // Determine the start and end lines for the merged snippet
  const startLineNumber = Math.min(
    a.location.startLineNumber,
    b.location.startLineNumber,
  );
  const endLineNumber = Math.max(
    a.location.endLineNumber,
    b.location.endLineNumber,
  );

  // Merge the actual content of the snippets
  const aLines = a.snippet.split("\n");
  const bLines = b.snippet.split("\n");

  // Create a map of line numbers to content
  const lineMap = new Map<number, string>();

  // Add lines from snippet A
  for (let i = 0; i < aLines.length; i++) {
    lineMap.set(a.location.startLineNumber + i, aLines[i]);
  }

  // Add lines from snippet B (will overwrite A's lines if there's overlap)
  for (let i = 0; i < bLines.length; i++) {
    lineMap.set(b.location.startLineNumber + i, bLines[i]);
  }

  // Create the merged snippet by joining lines in order
  const mergedLines: string[] = [];
  for (let i = startLineNumber; i <= endLineNumber; i++) {
    const line = lineMap.get(i);
    if (line !== undefined) {
      mergedLines.push(line);
    }
  }

  const snippet = mergedLines.join("\n");

  return {
    snippet,
    location: {
      filepath: a.location.filepath, // Assuming both snippets are from the same file
      startLineNumber,
      endLineNumber,
    },
  };
};

const mergeResult = (result: Result): Result => {
  const peeksInOriginalFile = result.peeks.filter(
    (it) => it.location.filepath === result.location.filepath,
  );

  const mergeResultsOriginalFile = peeksInOriginalFile.reduce<{
    mergedSnippet: {
      snippet: string;
      location: Location;
    };
    remainingPeeks: Peek[];
  }>(
    (acc, peek) => {
      if (
        isCodeSnippetOverlapping({
          a: peek.location,
          b: acc.mergedSnippet.location,
        })
      ) {
        return {
          mergedSnippet: mergeSnippets({ a: peek, b: acc.mergedSnippet }),
          remainingPeeks: acc.remainingPeeks,
        };
      }

      return {
        mergedSnippet: acc.mergedSnippet,
        remainingPeeks: [...acc.remainingPeeks, peek],
      };
    },
    {
      mergedSnippet: {
        snippet: result.snippet,
        location: result.location,
      },
      remainingPeeks: [],
    },
  );

  const peeksGroupedByFilepath = result.peeks
    .filter((it) => it.location.filepath !== result.location.filepath)
    .reduce<Record<string, Peek[]>>((prev, peek) => {
      prev[peek.location.filepath] = [
        ...(prev[peek.location.filepath] || []),
        peek,
      ];
      return prev;
    }, {});

  // Merge overlapping peeks in the same file
  const peeks = Object.entries(peeksGroupedByFilepath).flatMap(([_, peeks]) => {
    return (
      peeks
        // Sort by start line number
        .sort((a, b) => a.location.startLineNumber - b.location.startLineNumber)
        .reduce<{ accumulatingPeek: Peek | null; mergedPeeks: Peek[] }>(
          (acc, peek) => {
            // If it's the first peek, add it to the accumulator
            if (acc.accumulatingPeek === null) {
              return {
                accumulatingPeek: peek,
                mergedPeeks: [],
              };
            }

            // If the current peek overlaps with the accumulating peek, merge them
            if (
              isCodeSnippetOverlapping({
                a: acc.accumulatingPeek.location,
                b: peek.location,
              })
            ) {
              const merged = mergeSnippets({
                a: acc.accumulatingPeek,
                b: peek,
              });

              const mergedPeek: Peek = {
                definitionNodeKind: [
                  acc.accumulatingPeek.definitionNodeKind,
                  peek.definitionNodeKind,
                ].join(","),
                peekText: [acc.accumulatingPeek.peekText, peek.peekText].join(
                  ",",
                ),
                snippet: merged.snippet,
                location: merged.location,
              };

              return {
                accumulatingPeek: mergedPeek,
                mergedPeeks: acc.mergedPeeks,
              };
            }

            // Otherwise, set the peek to the new accumulating peek
            // and add the previous accumulating peek to the mergedPeeks
            return {
              accumulatingPeek: peek,
              mergedPeeks: [...acc.mergedPeeks, acc.accumulatingPeek],
            };
          },
          {
            accumulatingPeek: null,
            mergedPeeks: [],
          } satisfies { accumulatingPeek: Peek | null; mergedPeeks: Peek[] },
        )
    );
  });

  return {
    snippet: mergeResultsOriginalFile.mergedSnippet.snippet,
    location: mergeResultsOriginalFile.mergedSnippet.location,
    peeks: [
      ...mergeResultsOriginalFile.remainingPeeks,
      ...peeks.map((it) =>
        it.accumulatingPeek
          ? [it.accumulatingPeek, ...it.mergedPeeks]
          : it.mergedPeeks,
      ),
    ].flat(),
    config: result.config,
  };
};
