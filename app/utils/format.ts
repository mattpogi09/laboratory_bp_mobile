export const formatCurrency = (value = 0): string =>
  `₱${value.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;

export const formatDecimal = (value: number, decimals = 2): string =>
  value.toLocaleString("en-PH", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
