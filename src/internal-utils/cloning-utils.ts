// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function replaceNonCloneable(obj: any, visited: WeakSet<any>): any {
  // Quick check for primitives and try to format known non-cloneable objects
  if (obj === null) {
    return obj;
  }
  switch (typeof obj) {
    case "string":
      return obj;
    case "number":
      return obj;
    case "boolean":
      return obj;
    case "undefined":
      return obj;
    case "symbol":
      return obj.toString();
    case "bigint":
      return obj.toString();
    case "function":
      return `[Function: ${obj.name || "anonymous"}]`;
  }

  if (typeof obj === "object") {
    // Handle circular references
    if (visited.has(obj)) {
      return "[Circular]";
    }
    visited.add(obj);

    // Check known non-cloneable objects
    if (obj instanceof Error) {
      // Formatting of stack is non-standard so this might be a bit fragile
      const stack = [];
      if (obj.stack) {
        for (const line of obj.stack.split("\n")) {
          // Stop when it hits node_modules, no longer in users app code
          if (/node_modules/.test(line)) {
            break;
          }
          // Replace http://localhost:8501/_projects/...projectid.../dbtn/devx/ui/src/
          // to get short and readable relative paths
          const relative = line.replace(/(http:.*\/ui\/src\/)/, "");
          stack.push(relative);
        }
      }
      if (stack.length > 0) {
        // Assuming here the name and message is in the first line of the stack
        return stack.join("\n");
      }
      return `${obj.name ? obj.name : "Error"}: ${obj.message}`;
    }
    if (obj instanceof Response) {
      return "[FetchResponse]";
    }
    if (Promise.resolve(obj) === obj) {
      return "[Promise]";
    }

    // Recurse into arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => replaceNonCloneable(item, visited));
    }

    // Recurse into objects
    const clone: { [key: string]: unknown } = {};
    for (const [key, value] of Object.entries(obj)) {
      if (Object.hasOwn(obj, key)) {
        const newValue = replaceNonCloneable(value, visited);
        if (newValue !== undefined) {
          clone[key] = newValue;
        }
      }
    }
    return clone;
  }

  // General fallback that should guarantee a cloneable result
  try {
    // Try to clone the object, just in case there's something we've missed
    return structuredClone(obj);
  } catch (error) {
    // If structuredClone fails, fall back to a generic string representation
    return `[Non-Cloneable: ${typeof obj}]`;
  }
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function sanitiseObjectForPosting(input: any): any {
  return replaceNonCloneable(input, new WeakSet());
}
