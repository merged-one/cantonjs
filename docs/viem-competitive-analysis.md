# Viem Competitive Analysis

## 1. Architecture & Design Philosophy

### Why Viem Was Created

Viem was created by Tom Meagher (@tmm) and Jake Moxey (@jxom), the authors of wagmi (the dominant React Hooks library for Ethereum). While building wagmi on top of ethers.js, they identified a "quadrilemma" -- existing Ethereum interface libraries (ethers.js, web3.js) failed to simultaneously deliver on four fronts:

1. **Developer experience** -- ethers.js typing was loose; struct returns came back as positional arrays (`result[0]`, `result[1][0]`) instead of named objects
2. **Stability** -- ethers.js v5 to v6 migration broke large portions of the ecosystem
3. **Bundle size** -- ethers.js shipped ~130kB; web3.js even larger. On a slow 3G mobile connection, 130kB takes multiple seconds to load
4. **Performance** -- heavy BigNumber polyfills, eager async operations, unoptimized encoding

### Core Design Principles

**Functional over Object-Oriented.** Ethers.js uses classes (`Provider`, `Signer`, `Contract`). Viem uses plain functions ("actions") composed with client objects. This is the single most important architectural difference.

**Modular & Composable.** Viem's APIs are intentionally more verbose than ethers.js. The team considers this the right trade-off because it makes building blocks independently movable, changeable, and removable. Instead of `provider.getBlockNumber()` you write `getBlockNumber(client)`. This inversion enables tree-shaking at the individual function level.

**No Opinions Imposed.** Viem provides primitives, not frameworks. It enables consumers (like wagmi) to layer their own opinions on top without needing workarounds.

**Browser-Native Primitives.** Uses native `BigInt` instead of BigNumber libraries. No polyfills required for modern environments.

### Transport Abstraction Layer

Transports are the intermediary layer between a Client and the JSON-RPC backend. They are pluggable and composable:

| Transport | Import | Use Case |
|-----------|--------|----------|
| `http()` | `viem` | Standard HTTP JSON-RPC. Falls back to public RPC if no URL given |
| `webSocket()` | `viem` | Persistent connections for subscriptions/real-time data |
| `ipc()` | `viem/node` | Inter-process communication for local nodes (e.g., `/tmp/reth.ipc`) |
| `custom(provider)` | `viem` | EIP-1193 providers (MetaMask, WalletConnect, Coinbase SDK) |
| `fallback([...])` | `viem` | Ordered list of transports with automatic failover |

The Fallback transport is particularly notable -- it accepts an array of transports and automatically falls through on failure:

```ts
import { createPublicClient, fallback, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
  chain: mainnet,
  transport: fallback([
    http('https://eth-mainnet.g.alchemy.com/v2/...'),
    http('https://mainnet.infura.io/v3/...'),
    http() // public fallback
  ])
})
```

### Client Types

Viem intentionally avoids the overloaded term "provider" (EIP-1193 Provider vs. ethers Provider vs. RPC Provider all mean different things). Instead, it uses **Client**:

| Client | Purpose | Analogy |
|--------|---------|---------|
| **Public Client** | Read-only blockchain queries (blocks, txs, logs, contract reads) | ethers `JsonRpcProvider` |
| **Wallet Client** | Transaction signing and submission | ethers `Signer` |
| **Test Client** | Local test node manipulation (mine, snapshot, impersonate) | Hardhat/Anvil helpers |

Clients are created with factory functions and are plain objects (not class instances):

```ts
import { createPublicClient, createWalletClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http()
})

const walletClient = createWalletClient({
  chain: mainnet,
  transport: custom(window.ethereum!)
})
```

### Action-Based API vs Object-Oriented

**Ethers.js (object-oriented):**
```ts
const provider = new ethers.JsonRpcProvider(url)
const blockNumber = await provider.getBlockNumber()
const contract = new ethers.Contract(address, abi, provider)
const balance = await contract.balanceOf(account)
```

**Viem (action-based):**
```ts
const client = createPublicClient({ chain: mainnet, transport: http() })
const blockNumber = await getBlockNumber(client)
const balance = await readContract(client, {
  address, abi, functionName: 'balanceOf', args: [account]
})
```

The action-based approach means every function is independently importable and tree-shakable. The client is just a configuration carrier, not an object with methods.

---

## 2. Type System

### How ABI Type Inference Works

Viem achieves end-to-end type safety from ABI definitions to function calls **without any code generation step** (unlike TypeChain). The key mechanism:

1. You declare an ABI with `as const` (TypeScript const assertion)
2. Viem's type system (powered by ABIType) narrows the ABI literal type at the TypeScript level
3. Function names, argument types, and return types are all inferred from the narrowed ABI type

```ts
const abi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const  // <-- critical: const assertion preserves literal types

// functionName autocompletes to "balanceOf" | "totalSupply" etc.
// args is typed as [address: `0x${string}`]
// return type is inferred as bigint (from uint256)
const balance = await readContract(client, {
  address: '0x...',
  abi,
  functionName: 'balanceOf',  // autocomplete only shows view/pure functions
  args: ['0x...'],            // typed as [`0x${string}`]
})
// balance is typed as bigint
```

**Smart function filtering:** When using `readContract`, the `functionName` autocomplete only shows `view`/`pure` functions. When using `writeContract`, it only shows non-view functions. Viem's type system filters available function names based on the operation context.

### The Role of ABIType

[ABIType](https://abitype.dev/) is a standalone package (`@wevm/abitype`) that provides the type-level ABI parsing engine. It maps Solidity types to TypeScript types:

| Solidity Type | TypeScript Type |
|---------------|----------------|
| `uint256`, `int256` | `bigint` |
| `address` | `` `0x${string}` `` |
| `bool` | `boolean` |
| `string` | `string` |
| `bytes` | `` `0x${string}` `` |
| `uint8[]` | `readonly number[]` |
| Tuples/structs | Named object types |

ABIType is configurable -- you can customize type mappings (e.g., use a custom BigInt type) by augmenting the module declaration.

### Type-Safe Contract Reads/Writes

The struct handling difference between ethers.js and viem illustrates the type safety advantage:

**Ethers.js returns positional arrays:**
```ts
const result = await contract.getPosition(id)
// result[0] = owner (need to know position)
// result[1][0] = amount (nested positional access)
```

**Viem returns named, typed objects:**
```ts
const result = await readContract(client, {
  abi, address, functionName: 'getPosition', args: [id]
})
// result.owner  -- autocomplete + type-safe
// result.amount -- autocomplete + type-safe
```

### Known Trade-offs

The aggressive type inference can produce complex TypeScript errors that are difficult to debug. Chain, Account, and RpcSchema inference compound this -- users who want to abstract over viem's API (e.g., wrapping functions) may struggle with TypeScript gymnastics. This is an active discussion point in the community (GitHub issue #3549).

---

## 3. Package Structure

### Monorepo Organization

Viem uses **pnpm workspaces** with the following structure:

```
wevm/viem/
├── src/              # Main library source (the published package)
├── site/             # Documentation website (Vocs-based)
├── test/             # Test environments (bun, next, node, tsc, vite)
├── scripts/          # Build and utility scripts
├── contracts/        # Smart contracts for testing
├── environments/     # Environment configurations
├── vectors/          # Test vectors
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.build.json
└── biome.json        # Linting/formatting (replaces ESLint+Prettier)
```

The project is 95.3% TypeScript, 4.4% MDX (docs). It uses Biome for formatting/linting and Vitest for testing.

### Subpath Exports

Viem uses `package.json` `exports` field extensively for subpath imports:

| Export Path | Contents |
|-------------|----------|
| `viem` | Core: clients, transports, utilities, types |
| `viem/chains` | 350+ EVM chain definitions |
| `viem/accounts` | `privateKeyToAccount`, `mnemonicToAccount`, `hdKeyToAccount` |
| `viem/actions` | All actions for direct tree-shakable import |
| `viem/ens` | ENS resolution utilities |
| `viem/siwe` | Sign-In with Ethereum |
| `viem/node` | Node.js-specific (IPC transport) |
| `viem/window` | Browser-specific |
| `viem/utils` | Low-level encoding/decoding |
| `viem/op-stack` | OP Stack chain extensions |
| `viem/celo` | Celo chain extensions |
| `viem/zksync` | ZKsync chain extensions |
| `viem/linea` | Linea chain extensions |
| `viem/account-abstraction` | ERC-4337 primitives |
| `viem/experimental/*` | Multiple ERC standards (ERC-7715, ERC-7739, etc.) |
| `viem/tempo` | Access key / rate-limiting actions |
| `viem/nonce` | Nonce management |

### Tree-Shaking Approach

Viem publishes both ESM (`_esm/`) and CJS (`_cjs/`) builds. The tree-shaking works at two levels:

1. **Subpath level**: Only import `viem/chains` if you need chain definitions; `viem/accounts` if you need local signing
2. **Action level**: Import individual actions instead of using client methods

```ts
// Tree-shakable: only getBlockNumber is included
import { getBlockNumber } from 'viem/actions'
const blockNumber = await getBlockNumber(client)

// Less tree-shakable: pulls in all public actions
const client = createPublicClient({ ... })
const blockNumber = await client.getBlockNumber()
```

### Bundle Size

The project enforces size limits in its build configuration:

- Single chain import: ~500B
- Full CJS bundle: ~105kB (max)
- Typical tree-shaken app bundle: **~35kB** (minified + gzipped)

Comparison:
- **viem**: ~35kB (tree-shaken)
- **ethers.js v6**: ~130kB
- **web3.js v4**: ~200kB+

With wagmi + viem together (full React stack), typical bundle is ~70kB minified + gzipped.

---

## 4. Error Handling

### BaseError Class

All viem errors extend a custom `BaseError` class (which itself extends native `Error`):

```ts
class BaseError extends Error {
  details: string           // Human-readable detail string
  docsPath?: string         // Link to relevant docs page
  metaMessages?: string[]   // Additional context lines
  shortMessage: string      // Concise error description
  version: string           // Viem version that threw

  walk(): Error                                    // Walk to root cause
  walk(fn: (err: unknown) => boolean): Error | null // Walk until predicate matches
}
```

### Error Hierarchy

Errors form a nested cause chain. A typical contract interaction failure looks like:

```
ContractFunctionExecutionError
  └── CallExecutionError
       └── InsufficientFundsError
            └── InvalidInputRpcError
```

### Module-Level Error Types

Every viem action exports a companion `<Module>ErrorType` union type for typed catch blocks:

```ts
import { type GetBlockNumberErrorType } from 'viem'

try {
  await getBlockNumber(client)
} catch (err) {
  const e = err as GetBlockNumberErrorType
  // TypeScript knows the possible error shapes
}
```

### The `.walk()` Pattern

The recommended pattern for handling nested errors uses the `.walk()` method to traverse the cause chain:

```ts
import { BaseError, ContractFunctionRevertedError } from 'viem'

try {
  await publicClient.simulateContract({ ... })
} catch (err) {
  if (err instanceof BaseError) {
    const revertError = err.walk(
      e => e instanceof ContractFunctionRevertedError
    )
    if (revertError instanceof ContractFunctionRevertedError) {
      const errorName = revertError.data?.errorName ?? ''
      // e.g., "InsufficientBalance" -- maps to Solidity custom error
    }
  }
}
```

This pattern is particularly valuable because contract revert reasons from Solidity custom errors are decoded and available as typed data on the error object.

---

## 5. Key API Surface

### Client Creation

```ts
// Public Client -- read-only blockchain queries
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
  batch: { multicall: true },  // aggregate eth_call into multicall
  cacheTime: 10_000,           // cache TTL in ms
})

// Wallet Client -- JSON-RPC account (browser wallet)
const walletClient = createWalletClient({
  chain: mainnet,
  transport: custom(window.ethereum!),
})

// Wallet Client -- Local account (server-side)
const walletClient = createWalletClient({
  account: privateKeyToAccount('0x...'),
  chain: mainnet,
  transport: http(),
})

// Test Client -- Anvil/Hardhat node manipulation
const testClient = createTestClient({
  chain: hardhat,
  transport: http(),
  mode: 'hardhat', // or 'anvil' or 'ganache'
})
```

### Contract Interactions

```ts
// Read (view/pure functions)
const balance = await readContract(publicClient, {
  address: '0x...',
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: ['0x...'],
})

// Simulate (dry-run a write, get return value + catch reverts)
const { result } = await simulateContract(publicClient, {
  address: '0x...',
  abi: erc20Abi,
  functionName: 'transfer',
  args: ['0x...', parseEther('1')],
  account: '0x...',
})

// Write (submit transaction, returns tx hash only)
const hash = await writeContract(walletClient, {
  address: '0x...',
  abi: erc20Abi,
  functionName: 'transfer',
  args: ['0x...', parseEther('1')],
})
```

The **simulate-then-write** pattern is idiomatic viem:
```ts
const { request } = await simulateContract(publicClient, { ... })
const hash = await writeContract(walletClient, request)
```

### Contract Instances (getContract)

For convenience, `getContract` creates a bound interface (similar to ethers `Contract`):

```ts
const contract = getContract({
  address: '0x...',
  abi: erc20Abi,
  client: { public: publicClient, wallet: walletClient },
})

const balance = await contract.read.balanceOf(['0x...'])
const hash = await contract.write.transfer(['0x...', parseEther('1')])
const { result } = await contract.simulate.transfer(['0x...', parseEther('1')])
contract.watchEvent.Transfer(
  { from: '0x...' },
  { onLogs: logs => console.log(logs) }
)
```

Note: Contract instances pull in multiple action modules and are less tree-shakable than direct action calls.

### Event Watching

```ts
// Watch all Transfer events
const unwatch = publicClient.watchContractEvent({
  address: '0x...',
  abi: erc20Abi,
  eventName: 'Transfer',
  onLogs: logs => {
    // logs are typed based on the ABI event definition
  },
})

// Watch block numbers
const unwatch = publicClient.watchBlockNumber({
  onBlockNumber: blockNumber => console.log(blockNumber),
})
```

### Chain Definitions

Chains are plain objects satisfying the `Chain` type:

```ts
import { defineChain } from 'viem'

const myChain = defineChain({
  id: 12345,
  name: 'My Network',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.mychain.com'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.mychain.com' },
  },
})
```

Chains can include custom formatters for block/transaction structures (used by OP Stack, Celo, ZKsync) and custom fee estimation logic.

### Account Abstractions

Two account types:

```ts
// JSON-RPC Account -- signing delegated to wallet
const [address] = await walletClient.getAddresses()

// Local Account -- signing happens in-process
import { privateKeyToAccount, mnemonicToAccount } from 'viem/accounts'
const account = privateKeyToAccount('0x...')
const account2 = mnemonicToAccount('word1 word2 ...')
```

---

## 6. Ecosystem Integration

### Wagmi Wraps Viem for React

Wagmi v2 is built directly on viem. The relationship is:

```
wagmi (React Hooks) --> viem (core Ethereum operations) --> JSON-RPC
```

Every wagmi hook is a thin wrapper around a viem action that injects:
- **Multi-chain awareness** via Wagmi Config
- **Account management** via Connectors (MetaMask, WalletConnect, Coinbase, etc.)
- **React query caching** via TanStack Query

When wagmi doesn't have a hook for something, developers drop down to viem directly:

```ts
import { useClient } from 'wagmi'
import { getLogs } from 'viem/actions'

function MyComponent() {
  const client = useClient()
  // Use viem action directly with wagmi's client
  const logs = await getLogs(client, { ... })
}
```

### Permissionless.js Extends Viem for Account Abstraction

[permissionless.js](https://github.com/pimlicolabs/permissionless.js) by Pimlico is the canonical ERC-4337 library for viem. It follows viem's extension pattern:

```ts
import { createClient } from 'viem'
import { bundlerActions } from 'permissionless'

const bundlerClient = createClient({
  chain: mainnet,
  transport: http('https://bundler.example.com')
}).extend(bundlerActions)
```

Division of responsibility:
- **Viem core**: Low-level AA primitives (UserOperation encoding, ERC-4337 types)
- **Permissionless.js**: Smart account implementations (Safe, Kernel, Biconomy, Coinbase), bundler/paymaster integration, `createSmartAccountClient`
- Viem intentionally does not implement specific smart account types or intertwine UserOperations into its core transaction APIs

### The `.extend()` Plugin Pattern

This is viem's primary extensibility mechanism. It is used by:
- **viem/op-stack** -- OP Stack specific actions (deposits, withdrawals, proofs)
- **viem/zksync** -- ZKsync specific actions
- **viem/celo** -- Celo-specific transaction formatting
- **permissionless.js** -- Account abstraction actions
- **ERC-7715** -- Experimental permission management
- **ERC-7739** -- Experimental typed data signing

```ts
// Chain-specific extension
import { createPublicClient, http } from 'viem'
import { optimism } from 'viem/chains'
import { publicActionsL2 } from 'viem/op-stack'

const client = createPublicClient({
  chain: optimism,
  transport: http()
}).extend(publicActionsL2())
```

The pattern: an extension function receives the client and returns an object of additional methods. These are merged onto the client with full type inference.

---

## 7. Adoption & Metrics

### Current Numbers (as of March 2026)

| Metric | viem | ethers.js | web3.js |
|--------|------|-----------|---------|
| NPM weekly downloads | ~3.1M | ~3.1M | ~777K |
| GitHub stars | 3,429 | 8,653 | 19,962 |
| Open issues | 26 | 635 | 144 |
| Latest version | 2.47.6 | 6.16.0 | 4.16.0 |
| Last updated | Days ago | 4 months ago | 1 year ago |
| Dependent packages | 5,154 | -- | -- |
| Total releases | 593 | -- | -- |

### Download Trajectory

Viem has reached **download parity with ethers.js** at approximately 3.1M weekly downloads each. This represents explosive growth from near zero when viem launched in early 2023. Web3.js has fallen to roughly one-quarter of either library's downloads.

The crossover to parity occurred during 2025, driven by wagmi v2 adoption and the broader ecosystem shift.

### Key Projects Using Viem (directly or via wagmi)

Major organizations confirmed using wagmi/viem in production:
- **Stripe** -- Crypto payment integrations
- **Shopify** -- Web3 commerce features
- **Coinbase** -- CDP (Coinbase Developer Platform) wallet SDK (`@coinbase/cdp-wagmi`)
- **Uniswap** -- Frontend interfaces and SDK tooling
- **ENS** -- Ethereum Name Service interfaces
- **Optimism** -- OP Stack frontend tooling
- **Flashbots** -- SUAVE-specific fork (`suave-viem`)

### Development Velocity

- 4,297 commits on main branch
- 593 releases (roughly one release every 2 days)
- Only 26 open issues (vs. ethers.js at 635)
- 99.8% test coverage (tests run against forked Ethereum nodes)

---

## 8. Key Lessons for Canton

### Patterns Directly Applicable

**1. Action-based functional API over OOP classes.**
Canton's API should use standalone functions that accept a client/connection object rather than methods on class instances. This enables tree-shaking and makes the API composable. Instead of `cantonClient.getBalance(party)`, prefer `getBalance(client, { party })`.

**2. Client + Transport separation.**
Decouple "what you want to do" (client type) from "how you connect" (transport). Canton could have `createCantonClient({ transport: grpc() })` or `createCantonClient({ transport: http() })` with the same API surface regardless of transport.

**3. The `.extend()` plugin pattern.**
Canton-specific domain features (e.g., Daml-specific actions, workflow orchestration, party management) could be extensions rather than monolithic client classes. This keeps the core small and lets ecosystem contributors add capabilities.

**4. Const-assertion ABI type inference.**
Canton could use a similar pattern for Daml template definitions -- define templates as `const` TypeScript objects and infer choice argument types, contract key types, and payload types at the TypeScript level without codegen.

**5. Subpath exports for tree-shaking.**
Organize Canton's package with subpath exports: `cantonjs/templates`, `cantonjs/parties`, `cantonjs/ledger`, etc.

**6. Error hierarchy with `.walk()` traversal.**
Structured errors with cause chains and a traversal method are directly applicable. Canton errors could chain: `WorkflowExecutionError -> ChoiceExerciseError -> AuthorizationError`.

**7. Simulate-then-execute pattern.**
`simulateContract` before `writeContract` maps well to Canton's model -- dry-run a command submission before committing.

### Patterns Needing Adaptation

**1. Canton's party-based model vs. Ethereum's account model.**
Viem's account abstraction assumes a single signer per wallet client. Canton's multi-party model (where a transaction may require authorization from multiple parties) needs a fundamentally different authorization flow. The "Wallet Client" concept would need to become a "Party Client" or "Authorization Client" that can represent multi-party signing.

**2. Transaction finality model.**
Ethereum transactions are probabilistically final (wait for confirmations). Canton transactions are deterministically final (committed or rejected by the domain). The `watchBlockNumber` / polling pattern from viem may not apply -- Canton could use streaming/subscription patterns instead.

**3. Contract lifecycle differences.**
Ethereum contracts are deployed once and called repeatedly. Daml contracts are created, exercised, and archived. The `getContract` instance pattern needs adaptation to reflect Canton's contract lifecycle (active vs. archived, contract keys, divulgence).

**4. Read model differences.**
Viem's `readContract` calls a view function on-chain. Canton's read model is the Active Contract Set (ACS) -- reading is querying a local projection, not making an on-chain call. The API should reflect this fundamental difference.

**5. Chain definitions.**
Viem's `Chain` type assumes EVM-compatible networks. Canton's equivalent would be domain/participant configurations with different properties (domain ID, participant ID, sync protocol version, etc.).

**6. No global shared state assumption.**
Ethereum has global shared state visible to all participants. Canton's privacy model means different parties see different views. Client APIs need to be inherently party-scoped, which has no direct parallel in viem's architecture.

---

## Sources

- [Viem Official Site](https://viem.sh/)
- [Why Viem](https://viem.sh/docs/introduction)
- [Viem GitHub Repository](https://github.com/wevm/viem)
- [Viem TypeScript Docs](https://viem.sh/docs/typescript)
- [ABIType](https://abitype.dev/)
- [ABIType GitHub](https://github.com/wevm/abitype)
- [Viem Error Handling](https://www.viem.sh/docs/error-handling)
- [Viem Error Glossary](https://viem.sh/docs/glossary/errors)
- [BaseError Source](https://github.com/wevm/viem/blob/main/src/errors/base.ts)
- [Clients & Transports Introduction](https://viem.sh/docs/clients/intro)
- [Public Client Docs](https://viem.sh/docs/clients/public)
- [Wallet Client Docs](https://viem.sh/docs/clients/wallet)
- [Build Your Own Client](https://viem.sh/docs/clients/custom)
- [simulateContract](https://viem.sh/docs/contract/simulateContract)
- [readContract](https://viem.sh/docs/contract/readContract.html)
- [writeContract](https://viem.sh/docs/contract/writeContract)
- [Contract Instances](https://v1.viem.sh/docs/contract/getContract.html)
- [Chains Introduction](https://viem.sh/docs/chains/introduction)
- [HTTP Transport](https://viem.sh/docs/clients/transports/http.html)
- [WebSocket Transport](https://viem.sh/docs/clients/transports/websocket)
- [IPC Transport](https://viem.sh/docs/clients/transports/ipc)
- [Custom Transport](https://viem.sh/docs/clients/transports/custom)
- [Wagmi + Viem Guide](https://wagmi.sh/react/guides/viem)
- [Permissionless.js GitHub](https://github.com/pimlicolabs/permissionless.js/)
- [npm trends: ethers vs viem vs web3](https://npmtrends.com/ethers-vs-viem-vs-web3)
- [viem on npm](https://www.npmjs.com/package/viem)
- [MetaMask: Viem vs Ethers.js Comparison](https://metamask.io/news/viem-vs-ethers-js-a-detailed-comparison-for-web3-developers)
- [Dynamic: The Promise of Viem](https://www.dynamic.xyz/blog/the-promise-of-viem-a-typescript-library-for-interacting-with-ethereum)
