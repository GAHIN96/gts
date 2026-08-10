export const formatCurrency = (amount: number | undefined | null, currency: string | null = "USD"): string => {
  const safeAmount = Number(amount) || 0;

  if (!currency || currency.toUpperCase() === "USD") {
    return `$${safeAmount.toLocaleString()}`;
  }
  
  if (currency.toUpperCase() === "IQD") {
    return `IQD ${safeAmount.toLocaleString()}`;
  }

  return `${currency} ${safeAmount.toLocaleString()}`;
};
