export type RideStatus =
  | "requested"
  | "accepted"
  | "arriving"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface Ride {
  id: string;
  customerUserId: string;
  driverUserId?: string;
  status: RideStatus;
  fareEstimate: string;
  currency: string;
}
