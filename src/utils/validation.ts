export function validateProjectName(name: string): string | null {
  if (!name) { return 'Project name is required' }
  if (name.length > 214) { return 'Project name is too long (max 214 characters)' }
  if (!/^[a-z0-9][\w.-]*$/i.test(name)) {
    return 'Project name must start with a letter or number and can only contain letters, numbers, dots, hyphens, and underscores'
  }
  if (name === 'node_modules' || name === 'favicon.ico') {
    return `"${name}" is not a valid project name`
  }
  return null
}

export function validateIdentifier(name: string): string | null {
  if (!name) { return 'Name is required' }
  if (!/^[a-z_$][\w$]*$/i.test(name)) {
    return 'Name must be a valid JavaScript identifier (letters, numbers, $, _)'
  }
  return null
}
