import { Period } from "../types/reports";

export const getDateRange = (period: Period): { from: string; to: string } => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const to = today.toISOString().split("T")[0];

  const from = new Date();
  switch (period) {
    case "day":
      from.setHours(0, 0, 0, 0);
      break;
    case "week":
      from.setDate(today.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      break;
    case "month":
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      break;
    case "year":
      from.setMonth(0, 1);
      from.setHours(0, 0, 0, 0);
      break;
  }

  return {
    from: from.toISOString().split("T")[0],
    to,
  };
};

export const periods: { label: string; value: Period }[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];
