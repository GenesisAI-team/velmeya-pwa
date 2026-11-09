import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const raiz = process.cwd()
const leePublico = (nombre: string) =>
  readFileSync(resolve(raiz, 'public', nombre), 'utf8')
const leeRaiz = (nombre: string) => readFileSync(resolve(raiz, nombre), 'utf8')

describe('manifest PWA', () => {
  const manifest = JSON.parse(leePublico('manifest.webmanifest')) as {
    name: string
    short_name: string
    start_url: string
    display: string
    lang: string
    theme_color: string
    icons: Array<{ src: string; sizes: string; type: string; purpose: string }>
  }

  it('declara nombre, arranque, instalación standalone e idioma español', () => {
    expect(manifest.name).toMatch(/Velmeya/)
    expect(manifest.short_name).toBe('Velmeya')
    expect(manifest.start_url).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.lang).toBe('es')
    expect(manifest.theme_color).not.toBe('')
  })

  it('incluye un icono instalable con propósito maskable', () => {
    expect(
      manifest.icons.some(
        (icono) => icono.purpose === 'maskable' && icono.src.startsWith('/'),
      ),
    ).toBe(true)
  })

  it('está enlazado desde index.html con meta theme-color', () => {
    const index = leeRaiz('index.html')
    expect(index).toContain('rel="manifest"')
    expect(index).toMatch(/name="theme-color"/)
  })
})

describe('service worker offline mínimo', () => {
  const sw = leePublico('sw.js')

  it('existe y usa un nombre de caché versionado', () => {
    expect(sw).toMatch(/velmeya-shell-v\d+/)
  })

  it('responde a fetch y sirve un fallback offline para navegaciones', () => {
    expect(sw).toContain("addEventListener('fetch'")
    expect(sw).toMatch(/modoNav|mode === 'navigate'/)
  })

  it('se registra desde la entrada de la app en producción', () => {
    const main = leeRaiz('src/main.tsx')
    expect(main).toMatch(/serviceWorker/)
    expect(main).toMatch(/import\.meta\.env\.PROD/)
  })
})
