export const scanContractFixtures = {
  dsoInfo: {
    sv_party_id: 'DSO::global',
    network_name: 'splice-test',
    network_favicon_url: 'https://scan.example.com/favicon.ico',
  },
  ansEntryByName: {
    entry: {
      user: 'Alice::validator',
      name: 'alice.ans',
      url: 'https://alice.example.com',
      description: 'Alice app',
    },
  },
  updatePages: [
    {
      transactions: [
        {
          update_id: 'update-1',
          migration_id: 7,
          workflow_id: '',
          record_time: '2026-04-02T01:00:00.000Z',
          synchronizer_id: 'sync::1',
          effective_at: '2026-04-02T01:00:00.000Z',
          root_event_ids: [],
          events_by_id: {},
        },
        {
          update_id: 'update-2',
          offset: '8',
          record_time: '2026-04-02T01:00:01.000Z',
          event: {
            submitter: 'Alice::validator',
            source_synchronizer: 'sync::1',
            target_synchronizer: 'sync::2',
            migration_id: 8,
            unassign_id: 'unassign-update-2',
            reassignment_counter: 1,
            contract_id: 'contract-update-2',
          },
        },
      ],
    },
    {
      transactions: [
        {
          update_id: 'update-3',
          migration_id: 9,
          workflow_id: '',
          record_time: '2026-04-02T01:00:02.000Z',
          synchronizer_id: 'sync::1',
          effective_at: '2026-04-02T01:00:02.000Z',
          root_event_ids: [],
          events_by_id: {},
        },
      ],
    },
  ],
} as const
