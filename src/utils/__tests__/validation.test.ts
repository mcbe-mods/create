import { describe, expect, it } from 'vitest'
import { validateIdentifier, validateProjectName } from '../validation.js'

describe('validateProjectName', () => {
  it('should return null for valid names', () => {
    expect(validateProjectName('my-project')).toBeNull()
    expect(validateProjectName('my_project')).toBeNull()
    expect(validateProjectName('my.project')).toBeNull()
    expect(validateProjectName('MyProject123')).toBeNull()
    expect(validateProjectName('a')).toBeNull()
    expect(validateProjectName('1-start-with-number')).toBeNull()
  })

  it('should return error for empty name', () => {
    expect(validateProjectName('')).toBe('Project name is required')
  })

  it('should return error for names longer than 214 characters', () => {
    expect(validateProjectName('a'.repeat(215))).toBe('Project name is too long (max 214 characters)')
  })

  it('should return error for names with invalid characters', () => {
    expect(validateProjectName('!invalid')).toBe('Project name must start with a letter or number and can only contain letters, numbers, dots, hyphens, and underscores')
    expect(validateProjectName('space name')).toBe('Project name must start with a letter or number and can only contain letters, numbers, dots, hyphens, and underscores')
    expect(validateProjectName('@scoped/package')).toBe('Project name must start with a letter or number and can only contain letters, numbers, dots, hyphens, and underscores')
  })

  it('should return error for reserved names', () => {
    expect(validateProjectName('node_modules')).toBe('"node_modules" is not a valid project name')
    expect(validateProjectName('favicon.ico')).toBe('"favicon.ico" is not a valid project name')
  })
})

describe('validateIdentifier', () => {
  it('should return null for valid identifiers', () => {
    expect(validateIdentifier('foo')).toBeNull()
    expect(validateIdentifier('$foo')).toBeNull()
    expect(validateIdentifier('_foo')).toBeNull()
    expect(validateIdentifier('fooBar123')).toBeNull()
    expect(validateIdentifier('$')).toBeNull()
    expect(validateIdentifier('_')).toBeNull()
  })

  it('should return error for empty name', () => {
    expect(validateIdentifier('')).toBe('Name is required')
  })

  it('should return error for invalid identifiers', () => {
    expect(validateIdentifier('123abc')).toBe('Name must be a valid JavaScript identifier (letters, numbers, $, _)')
    expect(validateIdentifier('foo bar')).toBe('Name must be a valid JavaScript identifier (letters, numbers, $, _)')
    expect(validateIdentifier('foo-bar')).toBe('Name must be a valid JavaScript identifier (letters, numbers, $, _)')
  })
})
