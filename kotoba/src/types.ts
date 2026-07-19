/**
 * blockchain kotoba — record types.
 *
 * Per ADR-2605203000 Option B (PDS XRPC). Blockchain governance-authority
 * registry: networks / consensus rules / contract standards / DeFi protocols /
 * bridges. Public standards & governance metadata (no PII, no payment) →
 * 3-axis clean. ADR-2605172000 kotoba.
 *
 * Mirrors the vendor WRecord kinds (blockchain_network / consensus_rule /
 * contract_standard / defi_protocol / blockchain_bridge) as one kind-discriminated
 * entity collection.
 *
 * Identity hierarchy:
 *   did:web:blockchain.etzhayyim.com                           — controller
 *   did:web:blockchain.etzhayyim.com:network:ethereum          — a network
 *   did:web:blockchain.etzhayyim.com:contractStandard:erc-20   — a standard
 */

export const BC_DID_PREFIX = "did:web:blockchain.etzhayyim.com:" as const;

export type BlockchainKind =
  | "network"
  | "consensusRule"
  | "contractStandard"
  | "defiProtocol"
  | "bridge";

export const BLOCKCHAIN_KINDS: ReadonlySet<BlockchainKind> = new Set([
  "network",
  "consensusRule",
  "contractStandard",
  "defiProtocol",
  "bridge",
]);

export type EntityStatus = "proposed" | "active" | "deprecated" | "final";

export interface BlockchainEntityRecord {
  did: string;
  kind: BlockchainKind;
  /** Stable slug (lowercase alnum + hyphen), unique within kind. */
  slug: string;
  name: string;
  /** Chain this entity belongs to (rules/standards/protocols/bridges). */
  chain?: string;
  /** EVM chainId (networks). */
  chainId?: number;
  /** Standard id (e.g. "ERC-20", "BIP-39", "EIP-1559"). */
  standardId?: string;
  /** Category (consensus pow/pos; defi dex/lending; bridge lock-mint/...). */
  category?: string;
  status: EntityStatus;
  specUrl?: string;
  description?: string;
  source?: string;
  collectedAt: string;
  createdAt: string;
}

export interface BlockchainEntityView extends BlockchainEntityRecord {
  entityUri: string;
}

export interface RegisterEntityInput {
  kind: BlockchainKind;
  slug: string;
  name: string;
  chain?: string;
  chainId?: number;
  standardId?: string;
  category?: string;
  status?: EntityStatus;
  specUrl?: string;
  description?: string;
  source?: string;
}

export interface RegisterEntityOutput {
  status: "registered" | "alreadyExists" | "rejected";
  entityUri?: string;
  did?: string;
  slug?: string;
  error?: string;
}

export interface GetEntityInput {
  kind: BlockchainKind;
  slug: string;
}

export interface GetEntityOutput {
  entity?: BlockchainEntityView;
  error?: string;
}

export interface ListEntitiesInput {
  kind?: BlockchainKind;
  chain?: string;
  status?: EntityStatus;
  category?: string;
  limit?: number;
  cursor?: string;
}

export interface ListEntitiesOutput {
  items: BlockchainEntityView[];
  cursor?: string;
  total: number;
}

export interface CoverageInput {
  maxScan?: number;
}

export interface CoverageOutput {
  total?: number;
  byKind?: Record<string, number>;
  byChain?: Record<string, number>;
  byStatus?: Record<string, number>;
  truncated?: boolean;
  error?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────

export function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(slug);
}

export function entityDid(kind: BlockchainKind, slug: string): string {
  return `${BC_DID_PREFIX}${kind}:${normalizeSlug(slug)}`;
}

export function entityRkey(kind: BlockchainKind, slug: string): string {
  return `${kind}_${normalizeSlug(slug)}`;
}
