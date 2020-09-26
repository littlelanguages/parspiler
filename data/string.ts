export const dropLeft = (n: number, s: string): string => {
  const len = s.length;

  return (n < 0) ? s : (n > len) ? "" : s.substr(n);
};

export const dropRight = (n: number, s: string): string => {
  const len = s.length;

  return (n < 0) ? s : (n > len) ? "" : s.substr(0, len - n);
};
