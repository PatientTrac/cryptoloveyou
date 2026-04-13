import { readFile, stat } from 'fs/promises'
import { join } from 'path'

/** Must match HTML comments in repo root `index.html`. */
export const INDEX_CHROME_MARKERS = {
  headAssetsStart: '<!-- clu-chrome:head-assets-start -->',
  headAssetsEnd: '<!-- clu-chrome:head-assets-end -->',
  siteHeaderStart: '<!-- clu-chrome:site-header-start -->',
  siteHeaderEnd: '<!-- clu-chrome:site-header-end -->',
  siteFooterStart: '<!-- clu-chrome:site-footer-start -->',
  siteFooterEnd: '<!-- clu-chrome:site-footer-end -->',
  siteTrailStart: '<!-- clu-chrome:site-trail-start -->',
  siteTrailEnd: '<!-- clu-chrome:site-trail-end -->'
}

function sliceBetween(html, startToken, endToken, label) {
  const a = html.indexOf(startToken)
  const b = html.indexOf(endToken, a === -1 ? 0 : a + startToken.length)
  if (a === -1) {
    throw new Error(
      `index.html: missing chrome marker "${label}" start (${startToken}).`
    )
  }
  if (b === -1) {
    throw new Error(
      `index.html: missing chrome marker "${label}" end (${endToken}).`
    )
  }
  return html.slice(a + startToken.length, b).trim()
}

/**
 * Pull shared head assets, header, footer, and post–main-wrap trail from `index.html`.
 */
export function extractChromeFromIndexHtml(html) {
  const M = INDEX_CHROME_MARKERS
  let chromeTrail = sliceBetween(html, M.siteTrailStart, M.siteTrailEnd, 'site-trail')
  chromeTrail = chromeTrail.replace(
    /\n?\s*<script[^>]*homepage-content-loader\.js[^>]*>\s*<\/script>\s*/gi,
    '\n'
  )
  return {
    homepageHeadAssets: sliceBetween(html, M.headAssetsStart, M.headAssetsEnd, 'head-assets'),
    chromeHeader: sliceBetween(html, M.siteHeaderStart, M.siteHeaderEnd, 'site-header'),
    chromeFooter: sliceBetween(html, M.siteFooterStart, M.siteFooterEnd, 'site-footer'),
    chromeTrail
  }
}

let _cachedChrome = null
let _cachedMtimeMs = null
let _cachedPath = null

function chromeFilePath() {
  const p = process.env.SITE_CHROME_FILE?.trim()
  return p ? join(process.cwd(), p) : join(process.cwd(), 'index.html')
}

/**
 * Read `index.html` (or SITE_CHROME_FILE) and extract chrome. Cached per process unless `forceReread` is true.
 */
export async function loadChromeFromIndexHtml(options = {}) {
  const { forceReread = false } = options
  const chromePath = chromeFilePath()
  const st = await stat(chromePath)
  if (!forceReread && _cachedChrome && _cachedMtimeMs === st.mtimeMs && _cachedPath === chromePath) {
    return _cachedChrome
  }
  const html = await readFile(chromePath, 'utf-8')
  _cachedChrome = extractChromeFromIndexHtml(html)
  _cachedMtimeMs = st.mtimeMs
  _cachedPath = chromePath
  return _cachedChrome
}
