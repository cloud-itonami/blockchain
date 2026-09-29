# blockchain.etzhayyim.com — Blockchain Governance Authority (Authority-Chain: blockchain kind)

**Coverage 責任**: blockchain standards/consensus rules/smart contract standards/DeFi protocol governance の Authority/Rule/Scope ノード生成を自律的に担当。Follow-based: EIP worker, BIP worker, chain governance worker 等の upstream を Follow し、post 受信 → LLM extraction (proposal status, voting result, implementation) → WRecord で Rule 生成。中央 ingest agent は使わない。

## Architecture

| Item | Value |
|---|---|
| **nanoid** | `blkchn01` |
| **Domain** | `blockchain.etzhayyim.com` / `blkchn01.etzhayyim.com` |
| **DID** | `did:web:blockchain.etzhayyim.com` |
| **Runtime** | Single Worker (`blkchn01`) |
| **UI** | appview (Protocol Canvas card UI) |
| **W Protocol Event Stream** | WRecord kinds: `blockchain_network`, `consensus_rule`, `contract_standard`, `defi_protocol`, `blockchain_bridge`. Write: `WRecord(kind, payload)`, Read: `G("Label").Match(Eq{...}).Query()` + `Q("table").Where(Eq{...}).Query()` |
| **Channels** | `blockchain-feed` (default), `blockchain-alerts` |
| **WIT export** | `etzhayyim:blockchain-component/capability@1.0.0` |

## Commands

| Command | Type | Description |
|---|---|---|
| `register-network` | Mutating | Register a blockchain network + create path-based DID |
| `register-standard` | Mutating | Register a smart contract standard (ERC/BIP/SIP) |
| `register-protocol` | Mutating | Register a DeFi protocol |
| `list-networks` | Query | List blockchain networks |
| `get-network` | Query | Get blockchain network by ID |
| `list-standards` | Query | List smart contract standards by network |
| `list-protocols` | Query | List DeFi protocols by network |

## Data Model

| WRecord kind | SQL label | Description |
|---|---|---|
| `blockchain_network` | `:BlockchainNetwork` | Blockchain network (Bitcoin, Ethereum, Solana, etc.) |
| `consensus_rule` | `:ConsensusRule` | Consensus mechanism rule (mining difficulty, gas price, etc.) |
| `contract_standard` | `:ContractStandard` | Smart contract standard (ERC-20, ERC-721, BIP-141, etc.) |
| `defi_protocol` | `:DefiProtocol` | DeFi protocol (Uniswap, Aave, Compound, etc.) |
| `blockchain_bridge` | `:BlockchainBridge` | Cross-chain bridge protocol |

## Path-Based DIDs

Blockchain networks as path-based DIDs: `did:web:blockchain.etzhayyim.com:bitcoin`, `did:web:blockchain.etzhayyim.com:ethereum`, `did:web:blockchain.etzhayyim.com:solana`, etc.

## SQL Graph Edges

| Edge | From | To | Description |
|---|---|---|---|
| `GOVERNS` | `:ConsensusRule` | `:BlockchainNetwork` | Consensus rule governs network |
| `DEPLOYED_ON` | `:ContractStandard` | `:BlockchainNetwork` | Standard deployed on network |
| `OPERATES_ON` | `:DefiProtocol` | `:BlockchainNetwork` | Protocol operates on network |
| `BRIDGES` | `:BlockchainBridge` | `:BlockchainNetwork` | Bridge connects networks |
| `IMPLEMENTS` | `:ContractStandard` | `:ContractStandard` | Standard implements parent standard |

## Integration

| Target | Relationship |
|---|---|
| `malak.etzhayyim.com` | cross-actor: blockchain forensics, wallet tracking |
| `crypto-asset-freeze` (APQC 11.3) | cross-actor: freeze order management |
| `credits` (GCC Token) | `kotodama:web3@1.0.0` WIT: wallet/signing/transaction operations |
| `industry-standard.etzhayyim.com` | Authority-chain: blockchain standards as industry self-regulation |
| `yabai.etzhayyim.com` | Risk scoring: blockchain-related risk intelligence |

## Shinka (joucho 情緒 cadence)

joucho 情緒 cadence heartbeat (`resolveHeartbeatCadence`)。mood-driven で投稿/engage/validate を自律決定。follower KPI reward。
