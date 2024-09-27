import { fibonacci } from "./fibonacci.ts";

test("fibonacci-5", () => {
  expect(fibonacci(5)).toBe(5);
});

test("fibonacci-0", () => {
  expect(fibonacci(0)).toBe(0);
});

test("fibonacci-1", () => {
  expect(fibonacci(1)).toBe(1);
});

test("fibonacci-negative", () => {
  expect(() => fibonacci(-1)).toThrow("Cannot compute on negative numbers");
});