/**
 * blockchain kotoba — governance-authority registry (slice 1, 4/4 canonical).
 *
 *   registerEntity — register a network / consensusRule / contractStandard /
 *                    defiProtocol / bridge (rkey={kind}_{slug}, idempotent).
 *   getEntity      — by (kind, slug).
 *   listEntities   — cursor + kind/chain/status/category filter.
 *   coverage       — counts by kind / chain / status.
 *
 * Replaces vendor WRecord/RisingWave with AT PDS records (no RW). Public
 * standards + governance metadata → 3-axis clean.
 */

import type { Etzhayyim } from "@etzhayyim/sdk";
import {
  BLOCKCHAIN_KINDS,
  entityDid,
  entityRkey,
  isValidSlug,
  normalizeSlug,
  type BlockchainEntityRecord,
  type BlockchainEntityView,
  type BlockchainKind,
  type CoverageInput,
  type CoverageOutput,
  type EntityStatus,
  type GetEntityInput,
  type GetEntityOutput,
  type ListEntitiesInput,
  type ListEntitiesOutput,
  type RegisterEntityInput,
  type RegisterEntityOutput,
} from "./types.js";

const ENTITY_COLLECTION = "com.etzhayyim.apps.blockchain.entity";

const PAGE_LIMIT = 100;
const DEFAULT_MAX_SCAN = 10_000;

export async function registerEntity(
  e: Etzhayyim,
  input: RegisterEntityInput
): Promise<RegisterEntityOutput> {
  if (!input.kind || !input.slug || !input.name) {
    return { status: "rejected", error: "missingRequiredFields" };
  }
  if (!BLOCKCHAIN_KINDS.has(input.kind)) {
    return { status: "rejected", error: "invalidKind" };
  }
  const slug = normalizeSlug(input.slug);
  if (!isValidSlug(slug)) {
    return { status: "rejected", error: "invalidSlug" };
  }

  const rkey = entityRkey(input.kind, slug);
  const existing = await e
    .read<BlockchainEntityRecord>({ collection: ENTITY_COLLECTION, rkey })
    .catch(() => ({ records: [] }));
  if (existing.records[0]?.value) {
    return {
      status: "alreadyExists",
      entityUri: existing.records[0].uri,
      did: existing.records[0].value.did,
      slug,
    };
  }

  const did = entityDid(input.kind, slug);
  const now = new Date().toISOString();
  const record: BlockchainEntityRecord = {
    did,
    kind: input.kind,
    slug,
    name: input.name,
    chain: input.chain ? normalizeSlug(input.chain) : undefined,
    chainId: input.chainId,
    standardId: input.standardId,
    category: input.category,
    status: input.status ?? "active",
    specUrl: input.specUrl,
    description: input.description,
    source: input.source,
    collectedAt: now,
    createdAt: now,
  };
  const receipt = await e.write({
    collection: ENTITY_COLLECTION,
    record: record as unknown as Record<string, unknown>,
    rkey,
  });
  return { status: "registered", entityUri: receipt.uri, did, slug };
}

export async function getEntity(
  e: Etzhayyim,
  input: GetEntityInput
): Promise<GetEntityOutput> {
  if (!input.kind || !input.slug) return { error: "missingKindOrSlug" };
  const resp = await e
    .read<BlockchainEntityRecord>({
      collection: ENTITY_COLLECTION,
      rkey: entityRkey(input.kind, normalizeSlug(input.slug)),
    })
    .catch(() => ({ records: [] }));
  const r = resp.records[0];
  if (!r) return { error: "notFound" };
  return { entity: { ...r.value, entityUri: r.uri } };
}

export async function listEntities(
  e: Etzhayyim,
  input: ListEntitiesInput = {}
): Promise<ListEntitiesOutput> {
  const limit = Math.min(input.limit ?? 50, 200);
  const resp = await e.read<BlockchainEntityRecord>({
    collection: ENTITY_COLLECTION,
    cursor: input.cursor,
    limit,
  });
  const items: BlockchainEntityView[] = resp.records
    .filter((r) => {
      const v = r.value;
      if (input.kind && v.kind !== input.kind) return false;
      if (input.chain && v.chain !== normalizeSlug(input.chain)) return false;
      if (input.status && v.status !== input.status) return false;
      if (input.category && v.category !== input.category) return false;
      return true;
    })
    .map((r) => ({ ...r.value, entityUri: r.uri }));
  return { items, cursor: resp.cursor, total: items.length };
}

export async function coverage(
  e: Etzhayyim,
  input: CoverageInput = {}
): Promise<CoverageOutput> {
  const maxScan = Math.min(input.maxScan ?? DEFAULT_MAX_SCAN, DEFAULT_MAX_SCAN);
  let cursor: string | undefined;
  let scanned = 0;
  const byKind: Record<string, number> = {};
  const byChain: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  while (scanned < maxScan) {
    const page = await e.read<BlockchainEntityRecord>({
      collection: ENTITY_COLLECTION,
      cursor,
      limit: PAGE_LIMIT,
    });
    for (const r of page.records) {
      if (scanned >= maxScan) break;
      const v = r.value;
      byKind[v.kind as BlockchainKind] = (byKind[v.kind as BlockchainKind] ?? 0) + 1;
      if (v.chain) byChain[v.chain] = (byChain[v.chain] ?? 0) + 1;
      byStatus[v.status as EntityStatus] = (byStatus[v.status as EntityStatus] ?? 0) + 1;
      scanned += 1;
    }
    if (scanned >= maxScan || !page.cursor || page.records.length < PAGE_LIMIT) {
      break;
    }
    cursor = page.cursor;
  }
  return { total: scanned, byKind, byChain, byStatus, truncated: scanned >= maxScan };
}
