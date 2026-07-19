import { describe, it, expect, beforeEach } from "vitest";
import { MockEtzhayyim } from "@etzhayyim/sdk-mock";
import {
  registerEntity,
  getEntity,
  listEntities,
  coverage,
  isValidSlug,
  entityDid,
  entityRkey,
} from "../src/index.js";

describe("blockchain kotoba", () => {
  let e: any;
  beforeEach(() => {
    e = new MockEtzhayyim({ did: "did:web:blockchain.etzhayyim.com" });
  });

  describe("helpers", () => {
    it("validates slugs", () => {
      expect(isValidSlug("ethereum")).toBe(true);
      expect(isValidSlug("erc-20")).toBe(true);
      expect(isValidSlug("-bad")).toBe(false);
      expect(isValidSlug("ERC20")).toBe(false);
    });
    it("derives did + rkey per kind", () => {
      expect(entityDid("contractStandard", "ERC-20")).toBe(
        "did:web:blockchain.etzhayyim.com:contractStandard:erc-20"
      );
      expect(entityRkey("network", "Ethereum")).toBe("network_ethereum");
    });
  });

  describe("registerEntity", () => {
    const eth = {
      kind: "network" as const,
      slug: "ethereum",
      name: "Ethereum",
      chainId: 1,
      category: "pos",
      status: "active" as const,
    };
    it("registers a network", async () => {
      const r = await registerEntity(e, eth);
      expect(r.status).toBe("registered");
      expect(r.did).toContain("network:ethereum");
    });
    it("is idempotent on (kind, slug)", async () => {
      await registerEntity(e, eth);
      const again = await registerEntity(e, eth);
      expect(again.status).toBe("alreadyExists");
    });
    it("allows the same slug across different kinds", async () => {
      await registerEntity(e, eth);
      const std = await registerEntity(e, {
        kind: "contractStandard",
        slug: "ethereum",
        name: "fake",
      });
      expect(std.status).toBe("registered"); // distinct rkey by kind
    });
    it("rejects an invalid kind", async () => {
      const r = await registerEntity(e, { ...eth, kind: "rollup" as any });
      expect(r.status).toBe("rejected");
      expect(r.error).toBe("invalidKind");
    });
    it("rejects an invalid slug", async () => {
      const r = await registerEntity(e, { ...eth, slug: "Bad Slug" });
      expect(r.status).toBe("rejected");
      expect(r.error).toBe("invalidSlug");
    });
  });

  describe("list + coverage", () => {
    beforeEach(async () => {
      await registerEntity(e, {
        kind: "network",
        slug: "ethereum",
        name: "Ethereum",
        chain: "ethereum",
        status: "active",
      });
      await registerEntity(e, {
        kind: "contractStandard",
        slug: "erc-20",
        name: "ERC-20",
        chain: "ethereum",
        standardId: "ERC-20",
        status: "final",
      });
      await registerEntity(e, {
        kind: "defiProtocol",
        slug: "uniswap-v3",
        name: "Uniswap v3",
        chain: "ethereum",
        category: "dex",
        status: "active",
      });
    });
    it("filters by kind", async () => {
      const stds = await listEntities(e, { kind: "contractStandard" });
      expect(stds.total).toBe(1);
    });
    it("filters by chain", async () => {
      const eth = await listEntities(e, { chain: "ethereum" });
      expect(eth.total).toBe(3);
    });
    it("coverage aggregates by kind/chain/status", async () => {
      const cov = await coverage(e);
      expect(cov.total).toBe(3);
      expect(cov.byKind?.network).toBe(1);
      expect(cov.byKind?.defiProtocol).toBe(1);
      expect(cov.byChain?.ethereum).toBe(3);
      expect(cov.byStatus?.active).toBe(2);
      expect(cov.byStatus?.final).toBe(1);
    });
  });
});
