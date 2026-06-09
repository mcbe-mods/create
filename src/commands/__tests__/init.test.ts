import { describe, expect, it } from 'vitest'
import { parsePacks } from '../init.js'

describe('parsePacks', () => {
  it('should default to both packs when no argument given', () => {
    expect(parsePacks()).toEqual(['behavior_pack', 'resource_pack'])
    expect(parsePacks(undefined)).toEqual(['behavior_pack', 'resource_pack'])
  })

  it('should parse "bp" as behavior_pack', () => {
    expect(parsePacks('bp')).toEqual(['behavior_pack'])
  })

  it('should parse "rp" as resource_pack', () => {
    expect(parsePacks('rp')).toEqual(['resource_pack'])
  })

  it('should parse comma-separated packs', () => {
    expect(parsePacks('bp,rp')).toEqual(['behavior_pack', 'resource_pack'])
  })

  it('should parse full names', () => {
    expect(parsePacks('behavior_pack,resource_pack')).toEqual(['behavior_pack', 'resource_pack'])
    expect(parsePacks('behavior_pack')).toEqual(['behavior_pack'])
  })

  it('should trim whitespace', () => {
    expect(parsePacks(' bp , rp ')).toEqual(['behavior_pack', 'resource_pack'])
  })

  it('should pass through unknown values', () => {
    expect(parsePacks('bp,custom_pack')).toEqual(['behavior_pack', 'custom_pack'] as any)
  })
})
