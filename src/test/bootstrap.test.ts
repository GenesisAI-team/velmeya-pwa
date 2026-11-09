import { describe, expect, it } from 'vitest'
import pkg from '../../package.json'

// Smoke del bootstrap: garantiza que los quality gates definidos para el
// proyecto existen como comandos documentados (ver README y AGENTS.md).
describe('bootstrap del proyecto', () => {
  it('declara los scripts de calidad del proyecto', () => {
    const scripts = Object.keys(pkg.scripts as Record<string, string>)
    expect(scripts).toEqual(
      expect.arrayContaining(['dev', 'test', 'test:run', 'lint', 'typecheck', 'build']),
    )
  })

  it('declara React como dependencia de la app', () => {
    expect(pkg.dependencies).toHaveProperty('react')
    expect(pkg.dependencies).toHaveProperty('react-dom')
  })
})
