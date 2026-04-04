# Examples

These examples are organized by target user and boundary, not by feature checklist.

They show `cantonjs` as an application-side Ledger API V2 SDK:

- Participant-connected services and workers use `cantonjs`
- Participant-private React apps use `cantonjs-react`
- Public network dashboards use `cantonjs-splice-scan`
- Wallet-connected examples start with the official dApp SDK, then hand participant connection details into `cantonjs`

They do not replace Quickstart, and they do not turn `cantonjs` into the official wallet/dApp stack.

## Example Matrix

| Example | Audience | Data scope | Depends on |
| --- | --- | --- | --- |
| [Participant Service](/examples/basic) | Backend and full-stack participant services | Participant-private | Participant Ledger API V2 |
| [Participant Stream Worker](/examples/streaming) | Integration and data teams | Participant-private | Participant Ledger API V2 streams |
| [Participant-Private React App](/examples/react) | Participant-private React apps | Participant-private | Participant Ledger API V2 |
| [Public Scan Dashboard](/examples/public-scan-dashboard) | Public Scan consumers | Public | Public Scan |
| [Official Wallet Hand-Off](/examples/wallet-interop-with-dapp-sdk) | Wallet-connected app teams using official tooling | Participant-private after connection | Official dApp SDK + connected provider output |

## Prerequisites

- **Participant examples** (`/examples/basic`, `/examples/streaming`, `/examples/react`) assume you already have a participant URL plus auth for the acting party.
- **Public Scan example** assumes a public Scan URL.
  It does not require a participant client.
- **Official wallet hand-off example** assumes the official dApp SDK handles discovery and connection first.

For local participant work, a sandbox is enough:

```bash
cantonctl dev
```

That gives you a local participant endpoint such as `http://localhost:7575` for the participant-private examples.
