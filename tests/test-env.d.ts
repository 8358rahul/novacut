declare module 'node:test' {
  export function describe(name: string, fn: () => void | Promise<void>): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
}

declare module 'node:assert' {
  const assert: {
    (value: unknown, message?: string | Error): void;
    strictEqual<T>(actual: unknown, expected: T, message?: string | Error): void;
    notStrictEqual(actual: unknown, expected: unknown, message?: string | Error): void;
    ok(value: unknown, message?: string | Error): void;
    throws(fn: () => unknown, expected?: RegExp | Function | object | Error, message?: string | Error): void;
  };
  export default assert;
  export function strictEqual<T>(actual: unknown, expected: T, message?: string | Error): void;
  export function notStrictEqual(actual: unknown, expected: unknown, message?: string | Error): void;
  export function ok(value: unknown, message?: string | Error): void;
  export function throws(fn: () => unknown, expected?: RegExp | Function | object | Error, message?: string | Error): void;
}
