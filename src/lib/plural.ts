/** "1 finding", "3 findings". `many` defaults to `one` + "s". */
export function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}
