# Canton JSON Ledger API V2 -- Exact Request/Response Schemas

> Extracted from the **Canton 3.4.12-SNAPSHOT OpenAPI 3.0.3 spec** (`openapi.yaml`).
> Source: https://docs.digitalasset.com/build/3.4/reference/json-api/openapi.html
> Spec download: `https://docs.digitalasset.com/build/3.4/_downloads/a23802e25f301b336f3abce3560df56c/openapi.yaml`
> Local copy: `/tmp/canton-openapi-3.4.yaml` (7975 lines, 263KB)

**Date:** 2026-04-01

---

## 1. POST /v2/commands/submit-and-wait

Submit commands and wait for completion details.

### Request Body: `JsCommands`

```jsonc
{
  // Required
  "commands": [Command],        // array, non-empty -- see Command oneOf below
  "commandId": "string",        // unique identifier
  "actAs": ["partyId"],         // non-empty array of party ID strings

  // Optional
  "userId": "string",           // required unless using user token auth
  "readAs": ["partyId"],        // additional read-as parties
  "workflowId": "string",
  "deduplicationPeriod": DeduplicationPeriod,  // oneOf: see below
  "minLedgerTimeAbs": "string", // ISO datetime, mutually exclusive with minLedgerTimeRel
  "minLedgerTimeRel": Duration, // { "seconds": int64, "nanos": int32 }
  "submissionId": "string",
  "disclosedContracts": [DisclosedContract],
  "synchronizerId": "string",
  "packageIdSelectionPreference": ["string"],
  "prefetchContractKeys": [PrefetchContractKey],
  "tapsMaxPasses": int32        // TAPS max passes
}
```

### Response: `SubmitAndWaitResponse`

```jsonc
{
  "updateId": "string",         // Required -- the transaction's update ID
  "completionOffset": int64     // Required -- the completion offset
}
```

---

## 2. POST /v2/commands/submit-and-wait-for-transaction

Submit commands and wait for the full transaction response.

### Request Body: `JsSubmitAndWaitForTransactionRequest`

```jsonc
{
  // Required
  "commands": JsCommands,       // the FULL JsCommands object (see above)

  // Optional
  "transactionFormat": {        // TransactionFormat
    "transactionShape": "TRANSACTION_SHAPE_ACS_DELTA" | "TRANSACTION_SHAPE_LEDGER_EFFECTS" | "TRANSACTION_SHAPE_UNSPECIFIED",  // Required
    "eventFormat": EventFormat  // Required -- see EventFormat below
  }
}
```

**IMPORTANT:** The request wraps `JsCommands` inside a `commands` field plus an optional `transactionFormat`. If `transactionFormat` is omitted, defaults to ACS_DELTA shape with wildcard filter for all act_as/read_as parties with verbose=true.

### Response: `JsSubmitAndWaitForTransactionResponse`

```jsonc
{
  "transaction": JsTransaction  // Required -- see JsTransaction below
}
```

---

## 3. POST /v2/state/active-contracts

Query the active contract set.

**Query Parameters:**
- `limit` (int64, optional) -- max elements for HTTP list response
- `stream_idle_timeout_ms` (int64, optional)

### Request Body: `GetActiveContractsRequest`

```jsonc
{
  // Required
  "activeAtOffset": int64,      // the offset to snapshot at (0 = empty, positive = absolute offset)
  "eventFormat": EventFormat,   // Required -- see EventFormat below

  // Deprecated (removed in 3.5) -- mutually exclusive with eventFormat
  "filter": TransactionFilter,  // deprecated
  "verbose": boolean            // deprecated
}
```

### Response: Array of `JsGetActiveContractsResponse`

```jsonc
[
  {
    "workflowId": "string",     // Optional
    "contractEntry": JsContractEntry  // oneOf below
  }
]
```

**JsContractEntry** is oneOf:
```jsonc
{ "JsActiveContract": JsActiveContract }
| { "JsEmpty": {} }
| { "JsIncompleteAssigned": JsIncompleteAssigned }
| { "JsIncompleteUnassigned": JsIncompleteUnassigned }
```

**JsActiveContract:**
```jsonc
{
  "createdEvent": CreatedEvent,       // Required
  "synchronizerId": "string",        // Required
  "reassignmentCounter": int64       // Required (0 for original creation)
}
```

---

## 4. POST /v2/parties

Allocate a new party.

### Request Body: `AllocatePartyRequest`

```jsonc
{
  // All optional
  "partyIdHint": "string",       // hint for party ID
  "localMetadata": ObjectMeta,   // { "resourceVersion": "string", "annotations": { "key": "value" } }
  "identityProviderId": "string",
  "synchronizerId": "string",   // required if participant connected to multiple synchronizers
  "userId": "string"            // user to get act_as rights to new party
}
```

### Response: `AllocatePartyResponse`

```jsonc
{
  "partyDetails": {              // Required -- PartyDetails
    "party": "Alice::1220abcd...",  // Required -- full party ID string
    "isLocal": boolean,             // Optional
    "localMetadata": {              // Optional -- ObjectMeta
      "resourceVersion": "string",
      "annotations": { "key": "value" }
    },
    "identityProviderId": "string"  // Optional
  }
}
```

---

## 5. GET /v2/parties

List known parties.

**Query Parameters:**
- `identity-provider-id` (string, optional)
- `filter-party` (string, optional)
- `pageSize` (int32, optional)
- `pageToken` (string, optional)

### Response: `ListKnownPartiesResponse`

```jsonc
{
  "partyDetails": [PartyDetails],  // Required, non-empty array
  "nextPageToken": "string"        // Optional -- for pagination
}
```

---

## 6. POST /v2/users

Create a new user.

### Request Body: `CreateUserRequest`

```jsonc
{
  // Required
  "user": {                        // User object
    "id": "string",                // Required -- user identifier
    "primaryParty": "string",      // Optional
    "isDeactivated": boolean,      // Optional
    "metadata": ObjectMeta,        // Optional
    "identityProviderId": "string" // Optional
  },

  // Optional
  "rights": [                      // array of Right objects
    {
      "kind": Kind                 // oneOf -- see Kind below
    }
  ]
}
```

**Kind** (Right type) is oneOf:
```jsonc
{ "CanActAs": { "value": { "party": "partyId" } } }
| { "CanReadAs": { "value": { "party": "partyId" } } }
| { "CanExecuteAs": { "value": { "party": "partyId" } } }
| { "CanExecuteAsAnyParty": { "value": {} } }
| { "CanReadAsAnyParty": { "value": {} } }
| { "ParticipantAdmin": { "value": {} } }
| { "IdentityProviderAdmin": { "value": {} } }
```

### Response: `CreateUserResponse`

```jsonc
{
  "user": User  // Required -- same User schema as above
}
```

---

## 7. GET /v2/state/ledger-end

Get the current ledger end.

### Response: `GetLedgerEndResponse`

```jsonc
{
  "offset": int64    // Optional -- 0 if empty, positive if has data
}
```

Note: The 3.5 spec also includes `"recordTime": "datetime"` as required.

---

## 8. POST /v2/updates

Stream/query ledger updates.

**Query Parameters:**
- `limit` (int64, optional)
- `stream_idle_timeout_ms` (int64, optional)

### Request Body: `GetUpdatesRequest`

```jsonc
{
  // Required
  "updateFormat": {                // UpdateFormat
    "includeTransactions": {       // Optional -- TransactionFormat
      "transactionShape": "TRANSACTION_SHAPE_ACS_DELTA" | "TRANSACTION_SHAPE_LEDGER_EFFECTS",
      "eventFormat": EventFormat
    },
    "includeReassignments": EventFormat,  // Optional
    "includeTopologyEvents": TopologyFormat  // Optional
  },

  // Optional
  "beginExclusive": int64,        // start offset (exclusive), 0 = beginning
  "endInclusive": int64,          // end offset (inclusive), omit for open-ended

  // Deprecated (removed in 3.5) -- mutually exclusive with updateFormat
  "filter": TransactionFilter,
  "verbose": boolean
}
```

### Response: Array of `JsGetUpdatesResponse`

```jsonc
[
  {
    "update": Update  // oneOf below
  }
]
```

**Update** is oneOf:
```jsonc
{ "Transaction": { "value": JsTransaction } }
| { "Reassignment": Reassignment }
| { "OffsetCheckpoint": { "value": OffsetCheckpoint1 } }
| { "TopologyTransaction": TopologyTransaction }
```

---

## 9. POST /v2/dars

Upload a DAR file.

**Query Parameters:**
- `vetAllPackages` (boolean, optional)
- `synchronizerId` (string, optional)

### Request

Content-Type: `application/octet-stream`
Body: raw binary DAR file bytes

### Response: `UploadDarFileResponse`

```jsonc
{}  // empty object on success
```

Note: `/v2/packages` (POST) behaves identically but is deprecated.

---

## 10. GET /v2/version

Get the ledger API version.

### Response: `GetLedgerApiVersionResponse`

```jsonc
{
  "version": "string",           // Required
  "features": {                  // Required -- FeaturesDescriptor
    "experimental": ExperimentalFeatures,
    "userManagement": UserManagementFeature,
    "partyManagement": PartyManagementFeature,
    "offsetCheckpoint": OffsetCheckpointFeature,
    "packageFeature": PackageFeature
  }
}
```

---

## Shared Schema Definitions

### Command (oneOf)

```jsonc
{ "CreateCommand": CreateCommand }
| { "ExerciseCommand": ExerciseCommand }
| { "ExerciseByKeyCommand": ExerciseByKeyCommand }
| { "CreateAndExerciseCommand": CreateAndExerciseCommand }
```

### CreateCommand

```jsonc
{
  "templateId": "string",        // Required -- "#pkg-name:Module:Entity" or "pkgId:Module:Entity"
  "createArguments": {}           // Required -- Daml-LF JSON encoded record (no explicit type)
}
```

### ExerciseCommand

```jsonc
{
  "templateId": "string",        // Required -- template or interface ID
  "contractId": "string",        // Required
  "choice": "string",            // Required -- choice name
  "choiceArgument": {}            // Required -- Daml-LF JSON encoded value (no explicit type)
}
```

### ExerciseByKeyCommand

```jsonc
{
  "templateId": "string",        // Required
  "contractKey": {},              // Required -- Daml-LF JSON encoded value
  "choice": "string",            // Required
  "choiceArgument": {}            // Required
}
```

### CreateAndExerciseCommand

```jsonc
{
  "templateId": "string",        // Required
  "createArguments": {},          // Required
  "choice": "string",            // Required
  "choiceArgument": {}            // Required
}
```

### EventFormat

```jsonc
{
  "filtersByParty": {             // Optional -- Map<partyId, Filters>
    "Alice::1220...": {
      "cumulative": [CumulativeFilter]
    }
  },
  "filtersForAnyParty": {         // Optional -- Filters
    "cumulative": [CumulativeFilter]
  },
  "verbose": boolean              // Optional
}
```

### CumulativeFilter

```jsonc
{
  "identifierFilter": IdentifierFilter  // oneOf below
}
```

**IdentifierFilter** is oneOf:
```jsonc
{ "TemplateFilter": { "value": { "templateId": "string", "includeCreatedEventBlob": boolean } } }
| { "InterfaceFilter": { "value": { "interfaceId": "string", "includeInterfaceView": boolean, "includeCreatedEventBlob": boolean } } }
| { "WildcardFilter": { "value": { "includeCreatedEventBlob": boolean } } }
| { "Empty": {} }
```

### JsTransaction

```jsonc
{
  "updateId": "string",           // Required
  "commandId": "string",          // Optional
  "workflowId": "string",         // Optional
  "effectiveAt": "string",        // Required -- ISO datetime
  "events": [Event],              // Required, non-empty
  "offset": int64,                // Required
  "synchronizerId": "string",     // Required
  "recordTime": "string",         // Required -- ISO datetime
  "traceContext": TraceContext,    // Optional
  "externalTransactionHash": "string",  // Optional
  "paidTrafficCost": int64        // Optional
}
```

### Event (oneOf)

```jsonc
{ "CreatedEvent": CreatedEvent }
| { "ArchivedEvent": ArchivedEvent }
| { "ExercisedEvent": ExercisedEvent }
```

### CreatedEvent

```jsonc
{
  "offset": int64,                // Required
  "nodeId": int32,                // Required
  "contractId": "string",         // Required
  "templateId": "string",         // Required -- package-id reference format
  "packageName": "string",        // Required
  "representativePackageId": "string",  // Required
  "createArgument": {},            // Required -- Daml-LF JSON value (no explicit type)
  "signatories": ["partyId"],      // Required, non-empty
  "witnessParties": ["partyId"],   // Required, non-empty
  "acsDelta": boolean,             // Required
  "createdAt": "string",          // Required -- ISO datetime

  // Optional
  "contractKey": {},               // Daml-LF JSON value if template has key
  "createdEventBlob": "string",   // base64 blob
  "interfaceViews": [JsInterfaceView],
  "observers": ["partyId"]
}
```

### ArchivedEvent

```jsonc
{
  "offset": int64,                // Required
  "nodeId": int32,                // Required
  "contractId": "string",         // Required
  "templateId": "string",         // Required
  "packageName": "string",        // Required
  "witnessParties": ["partyId"],   // Required, non-empty

  // Optional
  "implementedInterfaces": ["string"]
}
```

### ExercisedEvent

```jsonc
{
  "offset": int64,                // Required
  "nodeId": int32,                // Required
  "contractId": "string",         // Required
  "templateId": "string",         // Required
  "choice": "string",             // Required
  "choiceArgument": {},            // Required -- Daml-LF JSON value
  "consuming": boolean,           // Required
  "lastDescendantNodeId": int32,  // Required
  "packageName": "string",        // Required
  "acsDelta": boolean,            // Required
  "actingParties": ["partyId"],    // Required, non-empty
  "witnessParties": ["partyId"],   // Required, non-empty

  // Optional
  "interfaceId": "string",
  "exerciseResult": {},            // Daml-LF JSON value
  "implementedInterfaces": ["string"]
}
```

### OffsetCheckpoint

```jsonc
{
  "offset": int64,                // Required -- absolute offset
  "synchronizerTimes": [          // Optional
    {
      "synchronizerId": "string",
      "recordTime": "string"      // ISO datetime
    }
  ]
}
```

### JsCantonError

```jsonc
{
  "code": "string",               // Required -- error code
  "cause": "string",              // Required
  "context": { "key": "value" },  // Required -- Map<string, string>
  "errorCategory": int32,         // Required

  // Optional
  "correlationId": "string",
  "traceId": "string",
  "resources": [["type", "id"]],  // array of [string, string] tuples
  "grpcCodeValue": int32,
  "retryInfo": "string",
  "definiteAnswer": boolean
}
```

### DeduplicationPeriod (oneOf)

```jsonc
{ "DeduplicationDuration": { "seconds": int64, "nanos": int32 } }
| { "DeduplicationOffset": { "value": int64 } }
| { "Empty": {} }
```

### ObjectMeta

```jsonc
{
  "resourceVersion": "string",    // Optional -- opaque version string
  "annotations": { "key": "value" }  // Optional -- Map<string, string>
}
```

### User

```jsonc
{
  "id": "string",                  // Required
  "primaryParty": "string",       // Optional
  "isDeactivated": boolean,       // Optional
  "metadata": ObjectMeta,         // Optional
  "identityProviderId": "string"  // Optional
}
```

### PartyDetails

```jsonc
{
  "party": "string",              // Required -- full party ID "Name::fingerprint"
  "isLocal": boolean,             // Optional
  "localMetadata": ObjectMeta,    // Optional
  "identityProviderId": "string"  // Optional
}
```

---

## Additional Endpoints

### POST /v2/commands/async/submit
- Request: `JsCommands` (same as submit-and-wait)
- Response: `SubmitResponse` (empty `{}`)

### POST /v2/commands/completions
- Request: `CompletionStreamRequest`
- Response: Array of `CompletionStreamResponse`

### GET /v2/packages
- Response: `ListPackagesResponse` `{ "packageIds": ["string"] }`

### GET /v2/users
- Query params: `identity-provider-id`, `pageSize` (int32), `pageToken` (string)
- Response: `ListUsersResponse` `{ "users": [User], "nextPageToken": "string" }`

### DELETE /v2/users/{user-id}
- Response: empty `{}`

### PATCH /v2/users/{user-id}
- Request: `UpdateUserRequest` `{ "user": User, "updateMask": { "paths": ["string"] } }`
- Response: `UpdateUserResponse` `{ "user": User }`

### POST /v2/users/{user-id}/rights (Grant Rights)
- Request: `GrantUserRightsRequest` `{ "userId": "string", "rights": [Right], "identityProviderId": "string" }`
- Response: `GrantUserRightsResponse` `{ "newlyGrantedRights": [Right] }`

### GET /v2/parties/{party}
- Response: same PartyDetails structure

### PATCH /v2/parties/{party}
- Request: `UpdatePartyDetailsRequest`
- Response: `UpdatePartyDetailsResponse`

### POST /v2/dars/validate
- Same request format as /v2/dars (binary body)
- Response: `UploadDarFileResponse` (empty `{}`)

### GET /v2/state/connected-synchronizers
- Response: `{ "connectedSynchronizers": [ConnectedSynchronizer] }`

### GET /v2/state/latest-pruned-offsets
- Response: `GetLatestPrunedOffsetsResponse`

### POST /v2/events/events-by-contract-id
- Request: `GetEventsByContractIdRequest`
- Response: `JsGetEventsByContractIdResponse`

### POST /v2/updates/update-by-offset
- Request includes `offset` (int64) and `updateFormat` (UpdateFormat)

### POST /v2/updates/update-by-id
- Request includes `updateId` (string) and `updateFormat` (UpdateFormat)

### GET /v2/parties/participant-id
- Response: `{ "participantId": "string" }`

---

## Key Observations for cantonjs

1. **submit-and-wait vs submit-and-wait-for-transaction**: Different request schemas. The former takes `JsCommands` directly; the latter wraps it in `{ commands: JsCommands, transactionFormat?: TransactionFormat }`.

2. **Offsets are int64** (not strings) in Canton 3.4+.

3. **Events are discriminated unions** using tagged object pattern: `{ "CreatedEvent": {...} }`, `{ "ArchivedEvent": {...} }`, etc.

4. **Filters use a nested tagged pattern**: `{ "WildcardFilter": { "value": { "includeCreatedEventBlob": true } } }`.

5. **Rights use deeply nested tagged pattern**: `{ "kind": { "CanActAs": { "value": { "party": "..." } } } }`.

6. **UploadDarFileResponse is empty** -- just `{}` on success.

7. **Template IDs** support two formats: `#package-name:Module:Entity` (package-name reference, preferred) and `packageId:Module:Entity` (deprecated package-id reference).

8. **Active contracts response** is an array, each element has `contractEntry` which is a tagged union.

9. **Updates response** is an array, each element has `update` which is a tagged union of Transaction, Reassignment, OffsetCheckpoint, or TopologyTransaction.

10. **The `createdAt` field on CreatedEvent is a string** (ISO datetime), not a timestamp object.

---

## Sources

- OpenAPI Spec: https://docs.digitalasset.com/build/3.4/reference/json-api/openapi.html
- JSON API V2 Guide: https://docs.digitalasset.com/build/3.4/explanations/json-api/index.html
- Tutorial: https://docs.digitalasset.com/build/3.5/tutorials/json-api/canton_and_the_json_ledger_api.html
- TypeScript Tutorial: https://docs.digitalasset.com/build/3.4/tutorials/json-api/canton_and_the_json_ledger_api_ts.html
- Transaction Ingestion: https://docs.digitalasset.com/integrate/devnet/exchange-integration/txingestion.html
- go-daml SDK: https://github.com/noders-team/go-daml
