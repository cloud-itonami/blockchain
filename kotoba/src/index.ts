/**
 * blockchain kotoba — barrel.
 *
 * Per ADR-2605203000 Option B Phase E reference impl. Blockchain governance-
 * authority registry on the etzhayyim substrate (AT PDS records; no RW).
 *
 * Slice 1: 4 of 4 canonical lexicons ported.
 *   registerEntity + getEntity + listEntities + coverage
 */

export * from "./types.js";
export { registerEntity, getEntity, listEntities, coverage } from "./registry.js";
