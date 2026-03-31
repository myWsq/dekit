import { describe, test, expect } from "vitest";
import { parseRef, formatPageRef, formatElementRef } from "./ref.js";

describe("parseRef", () => {
  test("parses page ref", () => {
    expect(parseRef("$${home}")).toEqual({ type: "page", pageKey: "home" });
  });

  test("parses element ref with class selector", () => {
    expect(parseRef("$${home@.hero}")).toEqual({
      type: "element",
      pageKey: "home",
      selector: ".hero",
    });
  });

  test("parses element ref with id selector", () => {
    expect(parseRef("$${about@#main-nav}")).toEqual({
      type: "element",
      pageKey: "about",
      selector: "#main-nav",
    });
  });

  test("parses element ref with compound selector", () => {
    expect(parseRef("$${dashboard@.sidebar > .menu}")).toEqual({
      type: "element",
      pageKey: "dashboard",
      selector: ".sidebar > .menu",
    });
  });

  test("parses element ref with nth-child", () => {
    expect(parseRef("$${about@section:nth-child(2)}")).toEqual({
      type: "element",
      pageKey: "about",
      selector: "section:nth-child(2)",
    });
  });

  test("throws on invalid format — missing $${ prefix", () => {
    expect(() => parseRef("home")).toThrow();
  });

  test("throws on invalid format — missing } suffix", () => {
    expect(() => parseRef("$${home")).toThrow();
  });

  test("throws on empty page key", () => {
    expect(() => parseRef("$${}")).toThrow();
  });

  test("throws on empty selector after @", () => {
    expect(() => parseRef("$${home@}")).toThrow();
  });
});

describe("formatPageRef", () => {
  test("formats page ref", () => {
    expect(formatPageRef("home")).toBe("$${home}");
  });
});

describe("formatElementRef", () => {
  test("formats element ref", () => {
    expect(formatElementRef("home", ".hero")).toBe("$${home@.hero}");
  });
});
