import { describe, expect, it } from 'vitest'
import { WS_READY_STATE } from './types.js'

describe('WS_READY_STATE', () => {
  it('matches the standard WebSocket readyState values', () => {
    expect(WS_READY_STATE).toEqual({
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
    })
  })

  it('uses distinct numeric states in connection order', () => {
    expect(Object.values(WS_READY_STATE)).toEqual([0, 1, 2, 3])
  })
})
