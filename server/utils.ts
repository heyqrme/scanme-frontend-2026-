export const parseJson = <T>(value: string): T => {
  return JSON.parse(value) as T;
};

export const distinct = (arr: string[]): string[] => [...new Set(arr)];

export function printResultsToStdout<T = object>(result: T) {
  console.log(JSON.stringify(result, null, 2));
}
