import { describe, expect, it } from 'vitest'
import { generateUUID, generateUUIDs } from '../uuid.js'

describe('generateUUID', () => {
  it('should return a string in UUID format', () => {
    const uuid = generateUUID()
    expect(uuid).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('should return unique values on each call', () => {
    const uuids = new Set(Array.from({ length: 100 }, () => generateUUID()))
    expect(uuids.size).toBe(100)
  })
})

describe('generateUUIDs', () => {
  it('should return an object with behaviorPack, resourcePack, module', () => {
    const uuids = generateUUIDs()
    expect(uuids).toHaveProperty('behaviorPack')
    expect(uuids).toHaveProperty('resourcePack')
    expect(uuids).toHaveProperty('module')
    expect(uuids.behaviorPack).toMatch(/^[0-9a-f-]{36}$/)
    expect(uuids.resourcePack).toMatch(/^[0-9a-f-]{36}$/)
    expect(uuids.module).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('should return unique UUIDs within the same call', () => {
    const uuids = generateUUIDs()
    const set = new Set([uuids.behaviorPack, uuids.resourcePack, uuids.module])
    expect(set.size).toBe(3)
  })
})
