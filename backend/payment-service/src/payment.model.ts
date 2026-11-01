export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export interface PaymentRecord {
  id: string;
  rideId: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
}
