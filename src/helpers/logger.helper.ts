import util from "util";

export const logger = {
  log: (...args: any) => {
    const formattedArgs = args.map((arg: any) => {
      if (typeof arg === "string") {
        return `\x1b[35m${arg}\x1b[0m`; // Apply purple color to string arguments
      }
      return util.inspect(arg, { colors: true }); // Preserve colors for other data types
    });
    console.log(...formattedArgs);
  },
  error: (...args: any) => {
    const formattedArgs = args.map((arg: any) => {
      if (typeof arg === "string") {
        return `\x1b[31m${arg}\x1b[0m`; // Apply red color to error string arguments
      }
      return util.inspect(arg, { colors: true }); // Preserve colors for other data types
    });
    console.error(...formattedArgs);
  },
};
