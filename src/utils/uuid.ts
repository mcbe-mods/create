import crypto from 'node:crypto'

export function generateUUID(): string {
  return crypto.randomUUID()
}

export function generateUUIDs(): { behaviorPack: string, resourcePack?: string, module: string } {
  return {
    behaviorPack: generateUUID(),
    resourcePack: generateUUID(),
    module: generateUUID(),
  }
}
