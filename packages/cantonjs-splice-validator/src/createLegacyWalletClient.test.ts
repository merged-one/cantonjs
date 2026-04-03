import { HttpError } from 'cantonjs'
import { describe, expect, it, vi } from 'vitest'
import { createLegacyWalletClient } from './createLegacyWalletClient.js'

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    statusText: init?.statusText ?? 'OK',
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
}

describe('createLegacyWalletClient', () => {
  it('supports transfer-offer creation, listing, and status lookup helpers', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ offer_contract_id: '#offer' }))
      .mockResolvedValueOnce(jsonResponse({ offers: [] }))
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'created',
          transaction_id: 'tx-1',
          contract_id: '#offer',
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'completed',
          transaction_id: 'tx-2',
          contract_id: '#amulet',
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          { error: 'unknown tracking id' },
          { status: 404, statusText: 'Not Found' },
        ),
      )
    const legacyWallet = createLegacyWalletClient({
      url: 'https://validator.example.com/api/validator',
      fetchFn,
    })

    const created = await legacyWallet.createTransferOffer({
      receiver_party_id: 'Receiver::validator',
      amount: '10.0',
      description: 'Legacy transfer offer',
      expires_at: 1_780_000_000_000_000,
      tracking_id: 'offer-123',
    })
    const listed = await legacyWallet.listTransferOffers()
    const knownStatus = await legacyWallet.getTransferOfferStatus({
      tracking_id: 'offer-123',
    })
    const lookupKnownStatus = await legacyWallet.lookupTransferOfferStatus({
      tracking_id: 'offer-123',
    })
    const lookupMissingStatus = await legacyWallet.lookupTransferOfferStatus({
      tracking_id: 'missing-offer',
    })

    expect(created.offer_contract_id).toBe('#offer')
    expect(listed.offers).toEqual([])
    expect(knownStatus.status).toBe('created')
    expect(lookupKnownStatus?.status).toBe('completed')
    expect(lookupMissingStatus).toBeUndefined()
    expect(fetchFn.mock.calls[0]?.[0]).toBe(
      'https://validator.example.com/api/validator/v0/wallet/transfer-offers',
    )
    expect(fetchFn.mock.calls[1]?.[1]?.method).toBe('GET')
    expect(fetchFn.mock.calls[2]?.[0]).toBe(
      'https://validator.example.com/api/validator/v0/wallet/transfer-offers/offer-123/status',
    )
    expect(fetchFn.mock.calls[2]?.[1]?.method).toBe('POST')
  })

  it('supports buy-traffic status helpers without swallowing non-404 failures', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ request_contract_id: '#request' }))
      .mockResolvedValueOnce(jsonResponse({ status: 'created' }))
      .mockResolvedValueOnce(jsonResponse({ status: 'failed', failure_reason: 'rejected' }))
      .mockResolvedValueOnce(
        jsonResponse(
          { error: 'unknown tracking id' },
          { status: 404, statusText: 'Not Found' },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          { error: 'wallet backend unavailable' },
          { status: 500, statusText: 'Internal Server Error' },
        ),
      )
    const legacyWallet = createLegacyWalletClient({
      url: 'https://validator.example.com/api/validator',
      fetchFn,
    })

    const created = await legacyWallet.createBuyTrafficRequest({
      receiving_validator_party_id: 'Validator::traffic',
      domain_id: 'domain::1',
      traffic_amount: 1024,
      tracking_id: 'traffic-123',
      expires_at: 1_780_000_000_000_000,
    })
    const knownStatus = await legacyWallet.getBuyTrafficRequestStatus({
      tracking_id: 'traffic-123',
    })
    const lookupKnownStatus = await legacyWallet.lookupBuyTrafficRequestStatus({
      tracking_id: 'traffic-123',
    })
    const lookupMissingStatus = await legacyWallet.lookupBuyTrafficRequestStatus({
      tracking_id: 'missing-traffic',
    })

    expect(created.request_contract_id).toBe('#request')
    expect(knownStatus.status).toBe('created')
    expect(lookupKnownStatus?.status).toBe('failed')
    expect(lookupMissingStatus).toBeUndefined()
    await expect(
      legacyWallet.lookupBuyTrafficRequestStatus({ tracking_id: 'boom' }),
    ).rejects.toThrow(HttpError)
    expect(fetchFn.mock.calls[1]?.[0]).toBe(
      'https://validator.example.com/api/validator/v0/wallet/buy-traffic-requests/traffic-123/status',
    )
    expect(fetchFn.mock.calls[1]?.[1]?.method).toBe('POST')
  })

  it('forwards signals and validates required path parameters', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ status: 'created' }))
    const legacyWallet = createLegacyWalletClient({
      url: 'https://validator.example.com/api/validator',
      fetchFn,
    })
    const controller = new AbortController()

    await legacyWallet.getTransferOfferStatus(
      { tracking_id: 'offer-123' },
      { signal: controller.signal },
    )

    expect(fetchFn.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)
    controller.abort()
    expect((fetchFn.mock.calls[0]?.[1]?.signal as AbortSignal).aborted).toBe(true)

    await expect(
      legacyWallet.getTransferOfferStatus({} as never),
    ).rejects.toThrow('Missing required legacy wallet path parameter: tracking_id')
  })

  it('forwards signals for create, list, and buy-traffic endpoints', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ offer_contract_id: '#offer' }))
      .mockResolvedValueOnce(jsonResponse({ offers: [] }))
      .mockResolvedValueOnce(jsonResponse({ request_contract_id: '#request' }))
      .mockResolvedValueOnce(jsonResponse({ status: 'created' }))
    const legacyWallet = createLegacyWalletClient({
      url: 'https://validator.example.com/api/validator',
      fetchFn,
    })
    const createTransferOfferController = new AbortController()
    const listTransferOffersController = new AbortController()
    const createBuyTrafficController = new AbortController()
    const getBuyTrafficStatusController = new AbortController()

    await legacyWallet.createTransferOffer(
      {
        receiver_party_id: 'Receiver::validator',
        amount: '10.0',
        description: 'Legacy transfer offer',
        expires_at: 1_780_000_000_000_000,
        tracking_id: 'offer-123',
      },
      { signal: createTransferOfferController.signal },
    )
    await legacyWallet.listTransferOffers({ signal: listTransferOffersController.signal })
    await legacyWallet.createBuyTrafficRequest(
      {
        receiving_validator_party_id: 'Validator::traffic',
        domain_id: 'domain::1',
        traffic_amount: 1024,
        tracking_id: 'traffic-123',
        expires_at: 1_780_000_000_000_000,
      },
      { signal: createBuyTrafficController.signal },
    )
    await legacyWallet.getBuyTrafficRequestStatus(
      { tracking_id: 'traffic-123' },
      { signal: getBuyTrafficStatusController.signal },
    )

    for (const [index, controller] of [
      createTransferOfferController,
      listTransferOffersController,
      createBuyTrafficController,
      getBuyTrafficStatusController,
    ].entries()) {
      expect(fetchFn.mock.calls[index]?.[1]?.signal).toBeInstanceOf(AbortSignal)
      controller.abort()
      expect((fetchFn.mock.calls[index]?.[1]?.signal as AbortSignal).aborted).toBe(true)
    }
  })

  it('does not swallow non-HttpError lookup failures', async () => {
    const legacyWallet = createLegacyWalletClient({
      url: 'https://validator.example.com/api/validator',
      fetchFn: vi.fn().mockRejectedValue(new Error('network exploded')),
    })

    await expect(
      legacyWallet.lookupTransferOfferStatus({ tracking_id: 'offer-123' }),
    ).rejects.toThrow('Failed to connect to Canton node at https://validator.example.com/api/validator')
  })

  it('does not treat non-object lookup failures as not-found responses', async () => {
    const legacyWallet = createLegacyWalletClient({
      url: 'https://validator.example.com/api/validator',
      fetchFn: vi.fn(),
    })

    legacyWallet.getTransferOfferStatus = vi.fn().mockRejectedValue('boom') as never

    await expect(
      legacyWallet.lookupTransferOfferStatus({ tracking_id: 'offer-123' }),
    ).rejects.toBe('boom')
  })
})
