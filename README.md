# `cloud-itonami/blockchain`

**This repository does not talk to any blockchain.** It is a registry *about*
blockchains — a governance-authority catalogue of networks, consensus rules,
contract standards, DeFi protocols and bridges, stored as AT Protocol PDS
records. Nothing here signs a transaction, connects to a peer, reads a block, or
holds a key.

The name is a bare subject noun and it undersells that distinction, so the
distinction is the first thing this file says.

| you want to… | go to |
|---|---|
| record that ERC-20 exists, is `final`, and belongs to Ethereum | **here** |
| speak the Bitcoin p2p wire protocol | `kotoba-lang/org-bitcoin-p2p` (read-only observer) |
| run a watch-only Bitcoin node from Clojure | `kotoba-lang/bitcoin-node` |
| encode/decode Ethereum ABI or call JSON-RPC | `kotoba-lang/org-ethereum-abi`, `kotoba-lang/org-ethereum-jsonrpc` |
| anchor a Kotobase checkpoint to a chain | `kotoba-lang/kotobase-anchor-fevm` |
| do chain forensics / wallet tracking | `cloud-itonami/malak` |

Those repos speak *to* chains. This one keeps a list of what chains have agreed
to. The only overlap is vocabulary.

---

## What is actually in here

Ten tracked files, 18,576 bytes. That is the whole repository — you can read all
of it in fifteen minutes, and [`docs/operator-quickstart.md`](docs/operator-quickstart.md)
walks you through doing exactly that.

```
AGENTS.md                     architecture the project intends (see the gap below)
README.edn                    extraction record, schema etzhayyim.repository/v1
migration.edn                 extraction provenance from etzhayyim/root
kotoba/src/types.ts           record shapes, DID derivation, slug rules
kotoba/src/registry.ts        the only behaviour in the repo — 4 functions
kotoba/src/index.ts           barrel
kotoba/test/blockchain.test.ts        10 tests
kotoba/package.json  tsconfig.json  vitest.config.ts
```

`kotoba/src/registry.ts` is the substance. Four async functions over an
`Etzhayyim` PDS client:

| function | what it does |
|---|---|
| `registerEntity` | writes one entity at `rkey = {kind}_{slug}`; idempotent, returns `alreadyExists` on repeat |
| `getEntity` | reads one by `(kind, slug)`; returns `{error: "notFound"}` rather than throwing |
| `listEntities` | reads one page, then filters it by kind/chain/status/category |
| `coverage` | pages the whole collection and counts by kind / chain / status |

Five entity kinds share one collection, discriminated by `kind` and separated by
rkey prefix: `network`, `consensusRule`, `contractStandard`, `defiProtocol`,
`bridge`. Each gets a path-based DID —
`did:web:blockchain.etzhayyim.com:contractStandard:erc-20`.

Verified on **2026-08-12** at commit `280f96a`:

| check | command | result |
|---|---|---|
| tests | `npm test` | 10 passed, 1 file, 194 ms |
| types | `npm run typecheck` | exit 0, no diagnostics |
| install | `npm install` | 135 packages, 311 MB, ~3 min |
| install without SSH | `GIT_SSH_COMMAND=/usr/bin/false npm install` on a cold cache | exit 0 — the eight git dependencies are all public and fetch over HTTPS |

## The gap between `AGENTS.md` and this repository

`AGENTS.md` describes a deployed system: a Worker named `blkchn01`, an appview
with a Protocol Canvas card UI, a W Protocol event stream over RisingWave, a WIT
export `etzhayyim:blockchain-component/capability@1.0.0`, channels, and a joucho
cadence heartbeat. **None of that is in this repository**, and the domain it
would live at does not exist:

```
$ dig @1.1.1.1 blockchain.etzhayyim.com A +noall +comment | grep status
;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 45577
$ dig @1.1.1.1 blkchn01.etzhayyim.com A +noall +comment | grep status
;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 30527
```

`etzhayyim.com` itself resolves and serves (Cloudflare, HTTP 200); there is no
wildcard, and both subdomains are NXDOMAIN rather than empty. So
`did:web:blockchain.etzhayyim.com` — the controller DID that every record in this
registry derives from — **cannot be resolved today**. The DIDs are well-formed
strings that no one can verify.

Read `AGENTS.md` as the design intent it is, not as a description of running
software. What is real is the `kotoba/` reference implementation, and it is real
in the specific sense that its tests pass against a mock PDS. It has never been
pointed at a live one.

Two smaller notes in the same spirit:

- `README.edn` names the repository `etzhayyim/com-etzhayyim-app-blockchain`.
  That was the name before the move to `cloud-itonami/blockchain`; GitHub still
  redirects it, so the record is stale but not broken.
- `migration.edn` records `:tracked-files 8 :bytes 17960` against today's 10
  files / 18,576 bytes. The difference is exactly `README.edn` (202) +
  `migration.edn` (414) — the record counts what it moved, before adding itself.
  It is consistent, not drifted.

## Substrate posture

Public standards and governance metadata only: no PII, no payment data, no
credentials. That is what `etzhayyim/root` calls **3-axis clean** — clean on
Liability, Custody and Settlement — and it is why this registry may live on a
plain PDS collection.

Two corrections to the ADR references in the source comments, if you go
looking:

- `types.ts` and `registry.ts` cite **ADR-2605172000** for the 3-axis posture.
  That ADR is *"open apps MUST be kotoba — AT MST + IPFS + Base L2 as primary
  substrate"* and never uses the term. The 3-axis rule is
  **ADR-2605172400**, *"etzhayyim / vendor split — 3-axis decision rule"*.
  Both are in `etzhayyim/root/90-docs/adr/`.
- **ADR-2605203000** is cited correctly: its Option B (*"PDS XRPC rewrite —
  DEFAULT for actor migration"*) is the decision to write `e.write({collection,
  …})` records instead of the vendor's WRecord/RisingWave stack. That is why
  `AGENTS.md`'s event-stream section describes machinery this code deliberately
  does not use.

If a future change here starts holding wallet balances, holder identities, or
anything a person could be identified by, that posture no longer holds and the
ADR needs revisiting before the code does.

## Getting started

[`docs/operator-quickstart.md`](docs/operator-quickstart.md). Every command in it
was run end to end before it was written, the outputs shown are the outputs that
came back, and §8 lists what it does not claim to have done.

Licence: Apache-2.0, declared in `kotoba/package.json`. There is no `LICENSE`
file in the repository.
