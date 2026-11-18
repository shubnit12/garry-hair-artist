import type { FormPatch } from "sanity";
import { describe, expect, it } from "vitest";

import { pickService, selectedReferenceId, serviceChangePatches, serviceIds } from "./serviceSync";

const patchType = Symbol("test-patch");
const set = (value: unknown, path: FormPatch["path"] = []) =>
  ({ type: "set", path, value, patchType }) as FormPatch;
const setIfMissing = (value: unknown, path: FormPatch["path"] = []) =>
  ({ type: "setIfMissing", path, value, patchType }) as FormPatch;
const unset = (path: FormPatch["path"] = []) => ({ type: "unset", path, patchType }) as FormPatch;

const haircut = { _id: "service-haircut", name: "Haircut", slug: "haircut", durationMinutes: 60 };
const colouring = { _id: "service-colour", name: "Colouring", slug: "colouring", durationMinutes: 150 };

describe("selectedReferenceId", () => {
  it("reads the id the reference input selects", () => {
    // What the Studio's reference input sends when an existing document is picked.
    const patches = [
      setIfMissing({}),
      set("reference", ["_type"]),
      set("service-colour", ["_ref"]),
      set(true, ["_weak"]),
      unset(["_strengthenOnPublish"]),
    ];
    expect(selectedReferenceId(patches)).toBe("service-colour");
  });

  it("reads a whole reference value (e.g. pasted)", () => {
    expect(selectedReferenceId([set({ _type: "reference", _ref: "service-haircut", _weak: true })])).toBe(
      "service-haircut",
    );
  });

  it("ignores clearing and unrelated patches", () => {
    expect(selectedReferenceId([unset()])).toBeUndefined();
    expect(selectedReferenceId([set(true, ["_weak"])])).toBeUndefined();
    expect(selectedReferenceId([set("", ["_ref"])])).toBeUndefined();
  });
});

describe("pickService", () => {
  it("prefers the published service and falls back to its draft", () => {
    const draft = { ...colouring, _id: "drafts.service-colour", durationMinutes: 180 };
    expect(pickService([draft, colouring], "service-colour")).toBe(colouring);
    expect(pickService([draft], "service-colour")).toBe(draft);
    expect(pickService([haircut], "service-colour")).toBeNull();
    expect(pickService([haircut], undefined)).toBeNull();
  });

  it("asks for both versions of each id", () => {
    expect(serviceIds("a", undefined, "b")).toEqual(["a", "drafts.a", "b", "drafts.b"]);
  });
});

describe("serviceChangePatches", () => {
  it("fills in an empty duration with the service's name and slug", () => {
    expect(serviceChangePatches(undefined, null, haircut)).toEqual([
      { set: { serviceName: "Haircut", serviceSlug: "haircut", durationMinutes: 60 } },
    ]);
  });

  it("follows the new service when the duration was the old service's", () => {
    expect(serviceChangePatches(60, haircut, colouring)).toEqual([
      { set: { serviceName: "Colouring", serviceSlug: "colouring", durationMinutes: 150 } },
    ]);
  });

  it("keeps a custom duration but still updates the name and slug", () => {
    expect(serviceChangePatches(90, haircut, colouring)).toEqual([
      { set: { serviceName: "Colouring", serviceSlug: "colouring" } },
    ]);
    // Previous service unknown (e.g. deleted): the stored length can't be told apart from a custom one.
    expect(serviceChangePatches(60, null, colouring)).toEqual([
      { set: { serviceName: "Colouring", serviceSlug: "colouring" } },
    ]);
  });

  it("never writes an invalid duration and clears a stale slug", () => {
    expect(serviceChangePatches(undefined, null, { _id: "x", name: "Consult", durationMinutes: 0 })).toEqual([
      { set: { serviceName: "Consult" } },
      { unset: ["serviceSlug"] },
    ]);
  });
});
