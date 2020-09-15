export function dropLeft(n: number, s: string): string {
  const len = s.length;

  if (n < 0) {
    return s;
  } else if (n > len) {
    return "";
  } else {
    return s.substr(n);
  }
}

export function dropRight(n: number, s: string): string {
  const len = s.length;

  if (n < 0) {
    return s;
  } else if (n > len) {
    return "";
  } else {
    return s.substr(0, len - n);
  }
}
