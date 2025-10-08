export function priceToCents(price: number): string {
  return Math.round(price * 100).toString();
}

export function centsToPrice(cents: string | number): number {
  return Number(cents) / 100;
}
