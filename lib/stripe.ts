// Stripe helper — no SDK needed. All Stripe calls use native fetch in /api/stripe/*

export function formatCurrency(amount: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)
}
