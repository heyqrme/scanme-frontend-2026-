import { peekCodeReferences } from "./peek";
import { printResultsToStdout } from "./utils";

function peekCommand(args: string[]) {
  const [filepath, fromLine, toLine] = args;

  if (!filepath || !fromLine || !toLine) {
    console.error("Missing required arguments: filepath fromLine toLine");
    process.exit(1);
  }

  const result = peekCodeReferences(
    filepath,
    Number.parseInt(fromLine, 10),
    Number.parseInt(toLine, 10),
  );

  return result;
}

const result = peekCommand(process.argv.slice(2));

printResultsToStdout(result);

// const parts: string[] = [
//   "<read-result>",
//   `<snippet path="${result.location.filepath}" lineStart="${result.location.startLineNumber}" lineEnd="${result.location.endLineNumber}">`,
//   result.snippet,
//   "</snippet>",
// ];

// if (result.peeks.length > 0) {
//   parts.push("<peeks>");
//   parts.push(
//     result.peeks
//       .map((peek) => {
//         const attrs = [
//           `peekText="${peek.peekText}"`,
//           `path="${peek.location.filepath}"`,
//           `lineStart="${peek.location.startLineNumber}"`,
//           peek.location.endLineNumber !== peek.location.startLineNumber
//             ? `lineEnd="${peek.location.endLineNumber}"`
//             : "",
//         ];

//         return `
// <peek ${attrs.join(" ")}>
// ${peek.snippet}
// </peek>`.trim();
//       })
//       .join("\n"),
//   );
//   parts.push("</peeks>");
// }

// parts.push("</read-result>");

// console.clear();
// console.log(`\n${parts.join("\n")}\n`);
