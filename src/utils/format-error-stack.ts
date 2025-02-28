export const formatErrorStack = (stack: string) => {
  const stackLines = stack.split('\n').map(line => line.trim());

  // Extract file paths and line numbers
  const formattedStack = stackLines.map(line => {
    const match = line.match(/(.+?) \((.+?):(\d+):(\d+)\)/);
    if (match) {
      const [, methodName, filePath, lineNumber, columnNumber] = match;
      return `${methodName} at ${filePath}:${lineNumber}:${columnNumber}`;
    }
    return line;
  });

  return formattedStack;
};
