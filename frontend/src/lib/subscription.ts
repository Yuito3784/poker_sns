export type SubscriptionStatus = "free" | "active" | "canceled" | "past_due";

export const isPremium = (status?: SubscriptionStatus | string | null): boolean => {
  if (!status) return false;
  return status === "active" || status === "canceled";
};

export const isPastDue = (status?: SubscriptionStatus | string | null): boolean => {
  return status === "past_due";
};

export const isCanceledButStillPremium = (
  status?: SubscriptionStatus | string | null,
  cancelAtPeriodEnd?: boolean,
): boolean => {
  return (status === "canceled" && !!cancelAtPeriodEnd) || false;
};

