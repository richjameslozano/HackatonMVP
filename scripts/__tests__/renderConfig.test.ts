import { describe, it, expect, beforeAll } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'

/**
 * Structure test suite for the repo-root `render.yaml`.
 *
 * Validates the Render Blueprint declares both services (static frontend +
 * docker backend) with the exact build, routing, health-check and environment
 * variable contracts required for deployment.
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 1.1, 1.2, 2.1, 3.1, 4.2, 4.3, 5.1, 5.2
 */

const REPO_ROOT = resolve(__dirname, '..', '..')
const RENDER_YAML_PATH = resolve(REPO_ROOT, 'render.yaml')

interface EnvVar {
  key: string
  value?: string
  sync?: boolean
}

interface Route {
  type: string
  source: string
  destination: string
}

interface RenderService {
  type?: string
  runtime?: string
  name?: string
  buildCommand?: string
  staticPublishPath?: string
  dockerfilePath?: string
  dockerContext?: string
  healthCheckPath?: string
  numInstances?: number
  routes?: Route[]
  envVars?: EnvVar[]
}

interface RenderConfig {
  services?: RenderService[]
}

let config: RenderConfig
let staticSite: RenderService
let webService: RenderService

function envKeys(service: RenderService): string[] {
  return (service.envVars ?? []).map((e) => e.key)
}

function findEnv(service: RenderService, key: string): EnvVar | undefined {
  return (service.envVars ?? []).find((e) => e.key === key)
}

beforeAll(() => {
  expect(existsSync(RENDER_YAML_PATH), 'render.yaml should exist at repo root').toBe(true)
  const raw = readFileSync(RENDER_YAML_PATH, 'utf8')
  config = parse(raw) as RenderConfig

  expect(Array.isArray(config.services)).toBe(true)
  // Exactly two services declared: the static frontend and the docker backend.
  expect(config.services).toHaveLength(2)

  const staticCandidate = config.services!.find((s) => s.runtime === 'static')
  const dockerCandidate = config.services!.find((s) => s.runtime === 'docker')

  expect(staticCandidate, 'a static-site service should be declared').toBeDefined()
  expect(dockerCandidate, 'a docker web service should be declared').toBeDefined()

  staticSite = staticCandidate!
  webService = dockerCandidate!
})

describe('render.yaml repo-root blueprint', () => {
  it('declares exactly one render.yaml at the repo root with both services', () => {
    expect(existsSync(RENDER_YAML_PATH)).toBe(true)
    expect(config.services).toHaveLength(2)
  })
})

describe('static-site service', () => {
  it('uses the static runtime', () => {
    expect(staticSite.runtime).toBe('static')
  })

  it('has the correct build command', () => {
    expect(staticSite.buildCommand).toBe('npm ci && tsc -b && vite build')
  })

  it('publishes from the dist directory', () => {
    expect(staticSite.staticPublishPath).toBe('dist')
  })

  it('declares the SPA rewrite route to index.html', () => {
    expect(Array.isArray(staticSite.routes)).toBe(true)
    const rewrite = (staticSite.routes ?? []).find(
      (r) => r.type === 'rewrite' && r.source === '/*' && r.destination === '/index.html',
    )
    expect(rewrite, 'rewrite route { type: rewrite, source: /*, destination: /index.html }').toBeDefined()
  })

  it('declares the six VITE_* environment variables', () => {
    const expected = [
      'VITE_BACKEND_URL',
      'VITE_WS_URL',
      'VITE_LARK_APP_ID',
      'VITE_LARK_APP_TOKEN',
      'VITE_LARK_REDIRECT_URI',
      'VITE_API_SHARED_SECRET',
    ]
    const keys = envKeys(staticSite)
    for (const key of expected) {
      expect(keys, `static-site should declare ${key}`).toContain(key)
    }
  })
})

describe('web (docker) service', () => {
  it('uses the docker runtime', () => {
    expect(webService.runtime).toBe('docker')
  })

  it('points to the backend Dockerfile', () => {
    expect(webService.dockerfilePath).toBe('./backend/Dockerfile')
  })

  it('uses the backend docker context', () => {
    expect(webService.dockerContext).toBe('./backend')
  })

  it('exposes the /health health check path', () => {
    expect(webService.healthCheckPath).toBe('/health')
  })

  it('runs a single instance', () => {
    expect(webService.numInstances).toBe(1)
  })

  it('declares the seven secret backend variables with sync: false', () => {
    const secrets = [
      'CORS_ORIGINS',
      'LARK_VERIFICATION_TOKEN',
      'LARK_APP_ID',
      'LARK_APP_SECRET',
      'LARK_BASE_APP_TOKEN',
      'CONFIGURED_TABLES',
      'API_SHARED_SECRET',
    ]
    for (const key of secrets) {
      const entry = findEnv(webService, key)
      expect(entry, `web service should declare secret ${key}`).toBeDefined()
      expect(entry!.sync, `${key} should use sync: false`).toBe(false)
      expect(entry!.value, `${key} should not declare an inline value`).toBeUndefined()
    }
  })

  it('declares the four non-secret backend variables with inline values', () => {
    const nonSecrets: Record<string, string> = {
      LARK_BASE_URL: 'https://open.larksuite.com/open-apis',
      MAX_CONNECTIONS: '50',
      CACHE_TTL_SECONDS: '300',
      BATCH_FLUSH_INTERVAL_SECONDS: '10',
    }
    for (const [key, value] of Object.entries(nonSecrets)) {
      const entry = findEnv(webService, key)
      expect(entry, `web service should declare ${key}`).toBeDefined()
      expect(String(entry!.value), `${key} should have value ${value}`).toBe(value)
    }
  })

  it('declares exactly the eleven backend variables', () => {
    const keys = envKeys(webService).sort()
    const expected = [
      'CORS_ORIGINS',
      'LARK_VERIFICATION_TOKEN',
      'LARK_APP_ID',
      'LARK_APP_SECRET',
      'LARK_BASE_APP_TOKEN',
      'CONFIGURED_TABLES',
      'API_SHARED_SECRET',
      'LARK_BASE_URL',
      'MAX_CONNECTIONS',
      'CACHE_TTL_SECONDS',
      'BATCH_FLUSH_INTERVAL_SECONDS',
    ].sort()
    expect(keys).toEqual(expected)
  })
})
