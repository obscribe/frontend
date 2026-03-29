/**
 * Format a date string as a human-friendly relative timestamp.
 *
 * - "Just now"        (< 1 minute)
 * - "5 minutes ago"   (< 1 hour)
 * - "2 hours ago"     (< 24 hours)
 * - "Yesterday"       (24-48 hours)
 * - "3 days ago"      (< 7 days)
 * - "Mar 25"          (same year)
 * - "Mar 25, 2024"    (different year)
 */
export function formatRelativeDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffHours < 48) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  const sameYear = d.getFullYear() === now.getFullYear()
  if (sameYear) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
