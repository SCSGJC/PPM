export function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function currency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
}

export function formatDecimal(value: number): string {
  return (value || 0).toFixed(2);
}

export function parseCurrency(text: string): number | null {
  if (!text) return null;
  const match = String(text).replace(/[, ]+/g, '').match(/([+-]?\d+(?:\.\d{1,2})?)/);
  return match ? Number(match[1]) : null;
}

export function escapeHtml(str: string): string {
  return String(str || '').replace(/[&<>"']/g, (s) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return map[s];
  });
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function formatInclusionsExclusionsHtml(text: string): string {
  if (!text) return '';

  return text
    .replace(/^Inclusions:/gm, '<strong>Inclusions:</strong>')
    .replace(/^Exclusions:/gm, '<strong>Exclusions:</strong>');
}

export function formatInclusionsExclusionsText(text: string): string {
  if (!text) return '';

  return text
    .replace(/^Inclusions:/gm, '**Inclusions:**')
    .replace(/^Exclusions:/gm, '**Exclusions:**');
}

export function findDuplicateItems(items: any[]): Set<string> {
  const duplicates = new Set<string>();
  const seen = new Map<string, string[]>();

  items.forEach(item => {
    const normalizedDesc = (item.description || '').toLowerCase().trim();
    if (!normalizedDesc) return;

    const key = `${item.section}:${normalizedDesc}`;

    if (!seen.has(key)) {
      seen.set(key, [item.id]);
    } else {
      const ids = seen.get(key)!;
      ids.forEach(id => duplicates.add(id));
      duplicates.add(item.id);
      ids.push(item.id);
    }
  });

  return duplicates;
}