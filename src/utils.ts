
export const doubleQuotify = (str: string): string => str.startsWith('"') && str.endsWith('"') ? str : `"${str}"`;