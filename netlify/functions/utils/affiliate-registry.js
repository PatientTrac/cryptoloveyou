import { readFile } from 'fs/promises'
import { join } from 'path'

let _cache = null

export async function readAffiliateRegistry() {
  if (_cache) return _cache
  try {
    const p = join(process.cwd(), 'data', 'affiliate-registry.json')
    const raw = await readFile(p, 'utf8')
    _cache = JSON.parse(raw)
    return _cache
  } catch {
    return null
  }
}

export async function getRegistryPlatform(platformKey) {
  const reg = await readAffiliateRegistry()
  return reg?.platforms?.[platformKey] || null
}

