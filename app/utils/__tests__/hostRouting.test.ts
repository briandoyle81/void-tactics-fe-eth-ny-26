import { describe, expect, it } from "vitest";
import { resolveHostRoute } from "../hostRouting";

const PROD = {
  playUrl: "https://play.voidtactics.xyz",
  siteUrl: "https://voidtactics.xyz",
};

describe("resolveHostRoute", () => {
  describe("play host", () => {
    it("serves the client at /", () => {
      expect(resolveHostRoute("play.voidtactics.xyz", "/", "", PROD)).toEqual({
        type: "rewrite",
        pathname: "/play",
        noIndex: true,
      });
    });

    it("serves other paths as-is, marked no-index", () => {
      expect(resolveHostRoute("play.voidtactics.xyz", "/admin", "", PROD)).toEqual({
        type: "next",
        noIndex: true,
      });
      expect(resolveHostRoute("play.voidtactics.xyz", "/42", "", PROD)).toEqual({
        type: "next",
        noIndex: true,
      });
    });
  });

  describe("site host", () => {
    it("serves the website at /", () => {
      expect(resolveHostRoute("voidtactics.xyz", "/", "", PROD)).toEqual({
        type: "next",
        noIndex: false,
      });
      expect(resolveHostRoute("voidtactics.xyz", "/privacy", "", PROD)).toEqual({
        type: "next",
        noIndex: false,
      });
    });

    it("redirects /play to the play host root", () => {
      expect(resolveHostRoute("voidtactics.xyz", "/play", "?x=1", PROD)).toEqual({
        type: "redirect",
        url: "https://play.voidtactics.xyz/?x=1",
      });
    });

    it("redirects client paths to the same path on the play host", () => {
      for (const path of ["/admin", "/tournaments", "/tournaments/3", "/123"]) {
        expect(resolveHostRoute("www.voidtactics.xyz", path, "", PROD)).toEqual({
          type: "redirect",
          url: `https://play.voidtactics.xyz${path}`,
        });
      }
    });

    it("redirects old ?chain= links to the play host", () => {
      expect(resolveHostRoute("voidtactics.xyz", "/", "?chain=flow", PROD)).toEqual({
        type: "redirect",
        url: "https://play.voidtactics.xyz/?chain=flow",
      });
    });

    it("leaves non-numeric single segments alone", () => {
      expect(resolveHostRoute("voidtactics.xyz", "/terms", "", PROD).type).toBe("next");
      expect(resolveHostRoute("voidtactics.xyz", "/players", "", PROD).type).toBe("next");
    });
  });

  describe("other hosts (local dev, previews)", () => {
    it("keeps the client at /play even when a play host is configured", () => {
      expect(resolveHostRoute("localhost:3000", "/play", "", PROD)).toEqual({
        type: "next",
        noIndex: false,
      });
      expect(resolveHostRoute("localhost:3000", "/", "?chain=base", PROD)).toEqual({
        type: "redirect",
        url: "/play?chain=base",
      });
    });

    it("routes paths only when no play host is configured", () => {
      const config = { siteUrl: PROD.siteUrl };
      expect(resolveHostRoute("voidtactics.xyz", "/play", "", config)).toEqual({
        type: "next",
        noIndex: false,
      });
      expect(resolveHostRoute("voidtactics.xyz", "/", "?chain=flow", config)).toEqual({
        type: "redirect",
        url: "/play?chain=flow",
      });
    });
  });
});
