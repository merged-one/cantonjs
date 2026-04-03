export const validatorContractFixtures = {
  ansCreateResponse: {
    entryContextCid: '#entry',
    subscriptionRequestCid: '#subscription',
    name: 'app.unverified.ans',
    url: 'https://app.example.com',
    description: 'Validator app',
  },
  ansListResponse: {
    entries: [
      {
        contractId: '#entry',
        name: 'app.unverified.ans',
        amount: '10.0',
        unit: 'AMULET',
        expiresAt: '2026-05-01T00:00:00.000Z',
        paymentInterval: 'P30D',
        paymentDuration: 'P30D',
      },
    ],
  },
  scanProxyDsoInfo: {
    network_name: 'splice-test',
    amulet_name: 'Amulet',
  },
  scanProxyAnsEntries: {
    entries: [
      {
        user: 'Alice::validator',
        name: 'alice.ans',
        url: 'https://alice.example.com',
        description: 'Alice app',
      },
    ],
  },
  createTransferOfferResponse: {
    offer_contract_id: '#offer',
  },
  transferOfferStatusResponse: {
    status: 'created',
    transaction_id: 'tx-1',
    contract_id: '#offer',
  },
} as const
