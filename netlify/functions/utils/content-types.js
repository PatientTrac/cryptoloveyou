export const CONTENT_TYPES = /** @type {const} */ ({
  SEO_ARTICLE: 'seo_article',
  REVIEW_PAGE: 'review_page',
  MONEY_PAGE: 'money_page'
})

export function isSupportedContentType(value) {
  return value === CONTENT_TYPES.SEO_ARTICLE || value === CONTENT_TYPES.REVIEW_PAGE || value === CONTENT_TYPES.MONEY_PAGE
}

export function normalizeContentType(value) {
  if (!value) return CONTENT_TYPES.SEO_ARTICLE
  const v = String(value)
  if (isSupportedContentType(v)) return v
  return CONTENT_TYPES.SEO_ARTICLE
}

export function assertValidDirectPayload(article) {
  const errors = validateStructuredArticle(article)
  if (errors.length) {
    const e = new Error(`Invalid article payload: ${errors.join('; ')}`)
    // @ts-ignore
    e.validationErrors = errors
    throw e
  }
}

export function validateStructuredArticle(article) {
  /** @type {string[]} */
  const errors = []

  if (!article || typeof article !== 'object') return ['article must be an object']

  if (!isNonEmptyString(article.slug)) errors.push('slug is required')
  if (!isNonEmptyString(article.title)) errors.push('title is required')

  const contentType = normalizeContentType(article.content_type || article.contentType)

  // Common-ish fields normalization checks
  if (article.internal_links && !Array.isArray(article.internal_links)) errors.push('internal_links must be an array if provided')
  if (article.ctas && !Array.isArray(article.ctas)) errors.push('ctas must be an array if provided')
  if (article.tags && !Array.isArray(article.tags)) errors.push('tags must be an array if provided')

  if (contentType === CONTENT_TYPES.SEO_ARTICLE) {
    const intro = article.sections?.intro
    if (!isNonEmptyString(intro)) errors.push('sections.intro is required for seo_article')

    const links = normalizeStringArray(article.internal_links || article.internalLinks || [])
    if (links.length < 1) errors.push('seo_article must include at least 1 internal_links entry')
  }

  if (contentType === CONTENT_TYPES.REVIEW_PAGE) {
    if (!isNonEmptyString(article.platform?.key)) errors.push('platform.key is required for review_page')
    if (!isNonEmptyString(article.sections?.what_it_is)) errors.push('sections.what_it_is is required for review_page')

    const kf = normalizeStringArray(article.sections?.key_features || [])
    if (kf.length < 3) errors.push('sections.key_features must have at least 3 items for review_page')

    const risks = normalizeStringArray(article.sections?.risks || [])
    if (risks.length < 2) errors.push('sections.risks must have at least 2 items for review_page')

    if (!isNonEmptyString(article.sections?.conclusion)) errors.push('sections.conclusion is required for review_page')
  }

  if (contentType === CONTENT_TYPES.MONEY_PAGE) {
    if (!isNonEmptyString(article.sections?.intro)) errors.push('sections.intro is required for money_page')
    if (!isNonEmptyString(article.sections?.risk_analysis)) errors.push('sections.risk_analysis is required for money_page')
    if (!isNonEmptyString(article.sections?.final_recommendation)) errors.push('sections.final_recommendation is required for money_page')

    const rows = article.comparison_table?.rows
    if (!Array.isArray(rows) || rows.length < 3) errors.push('comparison_table.rows must have at least 3 entries for money_page')

    const faqs = article.faqs
    if (!Array.isArray(faqs) || faqs.length < 3) errors.push('faqs must have at least 3 entries for money_page')
  }

  return errors
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0
}

function normalizeStringArray(v) {
  if (!Array.isArray(v)) return []
  return v.filter((x) => typeof x === 'string' && x.trim().length > 0)
}

