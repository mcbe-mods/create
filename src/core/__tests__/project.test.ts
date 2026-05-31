import { describe, expect, it } from 'vitest'
import { parseVersion } from '../project.js'

describe('parseVersion', () => {
  it('should parse "x.y.z" format', () => {
    expect(parseVersion('1.2.3')).toEqual([1, 2, 3])
    expect(parseVersion('0.0.0')).toEqual([0, 0, 0])
    expect(parseVersion('10.20.30')).toEqual([10, 20, 30])
  })

  it('should handle partial versions', () => {
    expect(parseVersion('1')).toEqual([1, 0, 0])
    expect(parseVersion('1.2')).toEqual([1, 2, 0])
  })

  it('should handle prerelease suffixes', () => {
    expect(parseVersion('1.0.0-beta')).toEqual([1, 0, 0])
    expect(parseVersion('2.3.4-alpha.1')).toEqual([2, 3, 4])
  })

  it('should handle empty string', () => {
    expect(parseVersion('')).toEqual([0, 0, 0])
  })
})
