# Operator quickstart — `cloud-itonami/blockchain`

Every command below was run end to end on **2026-08-12** against commit
`280f96a` on `main`, on macOS with Node v26.3.0 and npm 11. The output shown is
the output that came back. Where something surprised me, the surprise is written
down rather than smoothed over — §7 in particular is a behaviour you will hit in
production if nobody tells you about it, and §8 is the list of things this
document does **not** claim to have done.

Read [`../README.md`](../README.md) first. The short version: this repo is a
registry *about* blockchains, it never talks to one, and the deployed system its
`AGENTS.md` describes does not exist yet.

- §1–§2 need **nothing installed** — not even Node.
- §3–§7 need **Node ≥ 20 and npm**, about 311 MB of disk, and network access to
  github.com.

Timings are from an M-series Mac. Treat them as an order of magnitude.

---

## §1 Read the whole repository without installing anything

There are ten tracked files. That is not a subset — it is everything.

```bash
git ls-files
```

```
AGENTS.md
README.edn
kotoba/package.json
kotoba/src/index.ts
kotoba/src/registry.ts
kotoba/src/types.ts
kotoba/test/blockchain.test.ts
kotoba/tsconfig.json
kotoba/vitest.config.ts
migration.edn
```

```bash
git ls-files -z | xargs -0 wc -c
```

```
    3686 AGENTS.md
     202 README.edn
     841 kotoba/package.json
     415 kotoba/src/index.ts
    5184 kotoba/src/registry.ts
    3717 kotoba/src/types.ts
    3630 kotoba/test/blockchain.test.ts
     330 kotoba/tsconfig.json
     157 kotoba/vitest.config.ts
     414 migration.edn
   18576 total
```

Three files carry all the meaning:

| file | what it decides |
|---|---|
| `kotoba/src/types.ts` | the five entity kinds, the slug rule, and how a DID is derived from `(kind, slug)` |
| `kotoba/src/registry.ts` | the only behaviour in the repo — four functions over a PDS collection |
| `AGENTS.md` | the architecture the project *intends*, most of which is not built (see §8 and the README) |

Start with `types.ts`. It is 3.7 KB and once you know the shape of
`BlockchainEntityRecord` the registry reads itself.

## §2 Check the extraction record — still no dependencies

This repository was cut out of `etzhayyim/root`. The record of that cut is
`migration.edn`:

```bash
cat migration.edn
```

It is a single 414-byte line. Line-wrapped here for reading; the file has no
newlines inside it:

```clojure
{:schema "etzhayyim.migration/extracted-v1"
 :source {:repo "etzhayyim/root"
          :path "60-apps/etzhayyim-project-blockchain"
          :revision "691c245da48f3acb11dd757218f189ff2482b1c8"
          :git-tree "a15db3514862f630fd258e15153e003c2420249d"
          :tracked-files 8 :bytes 17960}
 :destination {:repo "etzhayyim/com-etzhayyim-app-blockchain"}
 :status :extracted :canonical-record-format :edn
 :go-files-created 0 :tinygo-files-created 0}
```

Two things look wrong here and neither is:

- **8 files / 17,960 bytes vs today's 10 / 18,576.** The difference is exactly
  `README.edn` (202) + `migration.edn` (414) = 616 bytes. The record counts what
  it moved, before adding itself to the destination.
- **`:destination` says `etzhayyim/com-etzhayyim-app-blockchain`.** The repo has
  since moved to `cloud-itonami/blockchain`. GitHub still redirects the old
  path, so the record resolves; it is stale, not broken.

## §3 Install

```bash
cd kotoba
npm install
```

```
added 135 packages, and audited 136 packages in 3m
```

~2m40s cold, and `node_modules` lands at **311 MB** — which is startling for a
13 KB source tree. It is `@etzhayyim/sdk` pulling `viem`, `@atproto/*`,
`@noble/post-quantum` and friends, none of which the four functions in this repo
actually exercise.

**You do not need SSH access to GitHub.** npm's lockfile rewrites the eight
git-sourced packages to `git+ssh://` URLs, which looks like it will demand a
key. It does not — all eight repos are public and npm fetches them over HTTPS.
Verified by breaking ssh on purpose against a cold cache:

```bash
GIT_SSH_COMMAND=/usr/bin/false npm install --cache /tmp/npmcache-probe
```

```
added 136 packages in 1m
```

Two warnings you will see and can ignore for this workflow:

- `npm warn allow-scripts 8 packages have install scripts not yet covered` —
  the SDK packages declare `prepare: tsc`. They did not run, and §4/§5 pass
  anyway, because vitest and `tsc` both consume the SDK's TypeScript sources
  directly rather than a built `dist/`.
- `npm warn gitignore-fallback No .npmignore file found` — cosmetic.

`node_modules/` is gitignored, so the 311 MB will not follow you into a commit.
`package-lock.json` is **not** tracked and **not** ignored — it will show up as
untracked after this step, and your install resolves the transitive tree fresh. The two `@etzhayyim/*` dependencies are
pinned to exact commits in `package.json`, so the parts that matter are stable;
everything below them floats.

**If you skip this step**, §4 fails like this, which is easy to misread as a
broken repo:

```
> vitest run
sh: vitest: command not found
```

## §4 Run the tests

```bash
npm test
```

```
 RUN  v4.1.10 /private/tmp/maturity-blockchain/kotoba

 Test Files  1 passed (1)
      Tests  10 passed (10)
   Duration  194ms (transform 33ms, setup 0ms, import 45ms, tests 5ms, environment 0ms)
```

Ten tests, all green, in under a fifth of a second. They run against
`MockEtzhayyim` from `@etzhayyim/sdk-mock` — an in-memory PDS. **No network, no
live PDS, no chain.** Nothing in this repository has ever been pointed at a real
Personal Data Server; see §8.

What the ten cover: slug validation, DID/rkey derivation, registration,
idempotency on `(kind, slug)`, the same slug being legal under two different
kinds, rejection of a bad kind, rejection of a bad slug, filtering by kind,
filtering by chain, and the coverage aggregation.

## §5 Typecheck

```bash
npm run typecheck
```

```
> @etzhayyim/blockchain-kotoba@0.0.0 typecheck
> tsc --noEmit
```

Exit 0, no diagnostics. `strict: true` and `noEmit: true` — this is a
type-checked source package, not a build. Note that `tsconfig.json` has
`"include": ["src/**/*.ts"]`, so **the test file is not typechecked**; it is only
type-checked incidentally by your editor. Vitest transpiles it without checking.

## §6 Drive the registry by hand

There is no CLI and no dev server. The way to poke at the four functions is a
scratch test file — vitest is already installed and already knows how to
transpile TypeScript, so this costs you nothing extra.

Create `test/scratch.test.ts`:

```ts
import { it } from "vitest";
import { MockEtzhayyim } from "@etzhayyim/sdk-mock";
import { registerEntity, getEntity, listEntities, coverage } from "../src/index.js";

it("scratch", async () => {
  const e = new MockEtzhayyim({ did: "did:web:blockchain.etzhayyim.com" });

  for (const input of [
    { kind: "network" as const, slug: "ethereum", name: "Ethereum", chain: "ethereum",
      chainId: 1, category: "pos", status: "active" as const },
    { kind: "network" as const, slug: "bitcoin", name: "Bitcoin", chain: "bitcoin",
      category: "pow", status: "active" as const },
    { kind: "contractStandard" as const, slug: "erc-20", name: "ERC-20 Token Standard",
      chain: "ethereum", standardId: "ERC-20", status: "final" as const,
      specUrl: "https://eips.ethereum.org/EIPS/eip-20" },
    { kind: "consensusRule" as const, slug: "eip-1559", name: "EIP-1559 fee market",
      chain: "ethereum", standardId: "EIP-1559", status: "final" as const },
    { kind: "defiProtocol" as const, slug: "uniswap-v3", name: "Uniswap v3",
      chain: "ethereum", category: "dex", status: "active" as const },
  ]) {
    const r = await registerEntity(e, input);
    console.log(`register ${input.kind}/${input.slug} ->`, r.status, r.did);
  }

  console.log("re-register ethereum ->",
    (await registerEntity(e, { kind: "network", slug: "ethereum", name: "Ethereum" })).status);
  console.log("bad kind ->", await registerEntity(e, { kind: "rollup" as any, slug: "x", name: "X" }));
  console.log("bad slug ->", await registerEntity(e, { kind: "network", slug: "Optimism Mainnet", name: "OP" }));
  console.log("no name  ->", await registerEntity(e, { kind: "network", slug: "base", name: "" }));

  console.log("get contractStandard/ERC-20 ->",
    JSON.stringify((await getEntity(e, { kind: "contractStandard", slug: "ERC-20" })).entity, null, 2));
  console.log("get network/solana ->", await getEntity(e, { kind: "network", slug: "solana" }));
  console.log("list kind=network ->", (await listEntities(e, { kind: "network" })).items.map((i) => i.slug));
  console.log("list chain=ethereum ->", (await listEntities(e, { chain: "ethereum" })).total);
  console.log("coverage ->", JSON.stringify(await coverage(e), null, 2));
});
```

Run it. **The `--disable-console-intercept` flag is not optional** — without it
vitest swallows every `console.log` on a passing test and you get a green tick
and no output, which looks like your code did not run:

```bash
npx vitest run test/scratch.test.ts --disable-console-intercept
```

```
register network/ethereum -> registered did:web:blockchain.etzhayyim.com:network:ethereum
register network/bitcoin -> registered did:web:blockchain.etzhayyim.com:network:bitcoin
register contractStandard/erc-20 -> registered did:web:blockchain.etzhayyim.com:contractStandard:erc-20
register consensusRule/eip-1559 -> registered did:web:blockchain.etzhayyim.com:consensusRule:eip-1559
register defiProtocol/uniswap-v3 -> registered did:web:blockchain.etzhayyim.com:defiProtocol:uniswap-v3
re-register ethereum -> alreadyExists
bad kind -> { status: 'rejected', error: 'invalidKind' }
bad slug -> { status: 'rejected', error: 'invalidSlug' }
no name  -> { status: 'rejected', error: 'missingRequiredFields' }
get contractStandard/ERC-20 -> {
  "did": "did:web:blockchain.etzhayyim.com:contractStandard:erc-20",
  "kind": "contractStandard",
  "slug": "erc-20",
  "name": "ERC-20 Token Standard",
  "chain": "ethereum",
  "standardId": "ERC-20",
  "status": "final",
  "specUrl": "https://eips.ethereum.org/EIPS/eip-20",
  "collectedAt": "2026-08-11T21:51:55.635Z",
  "createdAt": "2026-08-11T21:51:55.635Z",
  "entityUri": "at://did:web:blockchain.etzhayyim.com/com.etzhayyim.apps.blockchain.entity/contractStandard_erc-20"
}
get network/solana -> { error: 'notFound' }
list kind=network -> [ 'ethereum', 'bitcoin' ]
list chain=ethereum -> 4
coverage -> {
  "total": 5,
  "byKind": {
    "network": 2,
    "contractStandard": 1,
    "consensusRule": 1,
    "defiProtocol": 1
  },
  "byChain": {
    "ethereum": 4,
    "bitcoin": 1
  },
  "byStatus": {
    "active": 3,
    "final": 2
  },
  "truncated": false
}
```

(The two timestamps will differ on your run; everything else should match.)

Four things worth noticing in that output:

1. **`isValidSlug` does not predict what `registerEntity` accepts — do not
   pre-validate with it.** It is exported, it looks like the write-path guard,
   and it is not: `registerEntity` normalizes (trim + lowercase) *before*
   validating, so it accepts input the helper calls invalid. Probed directly:

   ```
   "ERC20"        isValidSlug: false register: registered erc20
   "ERC-20"       isValidSlug: false register: registered erc-20
   "  Erc-721  "  isValidSlug: false register: registered erc-721
   "-bad"         isValidSlug: false register: rejected invalidSlug
   "Bad Slug"     isValidSlug: false register: rejected invalidSlug
   "erc_20"       isValidSlug: false register: rejected invalidSlug
   "日本"          isValidSlug: false register: rejected invalidSlug
   ```

   Three of those seven "invalid" slugs write successfully. A caller who gates on
   `isValidSlug` first will silently refuse `ERC-20` — the single most obvious
   thing anyone will type into this registry. What actually gets rejected is a
   leading hyphen, or any character outside `[a-z0-9-]` *after* lowercasing:
   spaces, underscores, non-ASCII. The repo's own test asserts
   `isValidSlug("ERC20") === false`, which reads like "uppercase is rejected"
   but describes only the helper, not the write path.

   Case is therefore irrelevant end to end: `getEntity(…, {slug: "ERC20"})`
   returns the record stored as `erc20`.
2. **Rejections are return values, not exceptions.** All three bad inputs come
   back as `{status: "rejected", error: ...}`. If you `await` these without
   checking `.status`, failures are silent.
3. **`notFound` is likewise a value**, and `getEntity` swallows read errors with
   `.catch(() => ({records: []}))` — so a PDS that is *down* is indistinguishable
   from an entity that does not exist. On a live server that matters.
4. **`chain` is free text, normalized to lowercase, and never validated against
   the registered networks.** Nothing stops you writing a standard whose `chain`
   is `"etherium"`. There are no foreign keys here.

Delete `test/scratch.test.ts` when you are done — `npm test` picks up anything
matching `test/**/*.test.ts`.

## §7 The one behaviour that will bite you: `listEntities` filters *after* paging

`listEntities` reads **one page** and then filters that page in memory. It does
not search the collection. Put 60 standards in ahead of 3 networks and ask for
the networks:

```ts
for (let i = 0; i < 60; i++) {
  await registerEntity(e, { kind: "contractStandard", slug: `erc-${1000 + i}`,
    name: `ERC-${1000 + i}`, chain: "ethereum", status: "final" });
}
for (const s of ["solana", "sui", "aptos"]) {
  await registerEntity(e, { kind: "network", slug: s, name: s, chain: s, status: "active" });
}

const def = await listEntities(e, { kind: "network" });
console.log("A default limit(50) ->", def.total, def.cursor);
const wide = await listEntities(e, { kind: "network", limit: 200 });
console.log("B limit=200         ->", wide.total, wide.items.map((i) => i.slug));
const page2 = await listEntities(e, { kind: "network", cursor: def.cursor });
console.log("C page 2 via cursor ->", page2.total, page2.items.map((i) => i.slug));
```

```
A default limit(50) -> 0 contractStandard_erc-1050
B limit=200         -> 3 [ 'solana', 'sui', 'aptos' ]
C page 2 via cursor -> 3 [ 'solana', 'sui', 'aptos' ]
```

**Line A returns zero networks while three networks exist.** The default page of
50 was all standards, and the filter had nothing to keep. Consequences:

- `total` is *this page after filtering*, **not** a count of matches in the
  collection. Never report it as one.
- An empty `items` with a non-`undefined` `cursor` means **keep going**, not
  "no results". Only `cursor === undefined` means you have reached the end.
- `limit` caps the raw read (max 200), not the filtered result, so raising it
  makes filters *appear* to start working. That is a coincidence of collection
  size, not a fix.

If you want a true count, use `coverage` — it pages the entire collection:

```
D coverage total: 63 byKind: { contractStandard: 60, network: 3 } truncated: false
E coverage maxScan=10     -> total: 10 truncated: true
F coverage maxScan=999999 -> total: 63 truncated: false
```

`maxScan` is clamped to 10,000 (`Math.min(input.maxScan ?? 10_000, 10_000)`), so
F does not scan a million — it scans everything up to the cap. Above 10,000
entities `coverage` silently stops and sets `truncated: true`. **Check that
flag**; it is the only signal you are looking at a partial count. Note also that
a collection of exactly 10,000 reports `truncated: true` when it is in fact
complete, because the test is `scanned >= maxScan`.

## §8 What this document does not claim

- **Nothing here has touched a real PDS.** Every result above came from
  `MockEtzhayyim`, an in-memory double. Latency, pagination edges, auth,
  rate limits and partial-write behaviour on a live server are all unobserved.
- **The DIDs cannot be resolved.** `blockchain.etzhayyim.com` is NXDOMAIN
  (checked against 1.1.1.1; there is no wildcard on the zone). Every
  `did:web:blockchain.etzhayyim.com:*` string in the output above is well-formed
  and unresolvable.
- **The Worker, appview, W Protocol stream, WIT export and joucho heartbeat in
  `AGENTS.md` were not exercised, because no code for them is in this
  repository.** I did not verify whether they exist elsewhere.
- **I did not run this on Linux or Windows,** and did not test Node versions
  other than v26.3.0.
- **`registerEntity`'s read-then-write is not atomic** — two concurrent
  registrations of the same `(kind, slug)` could both see "not present". I
  reasoned this from the source; I did not build a race to prove it, and the
  mock would not have shown it.
- **No performance claim.** 311 MB and ~3 minutes are one machine with a warm
  npm cache, once.
