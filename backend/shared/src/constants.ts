export const USER_ROLES = ["customer", "driver"] as const;

export const KAFKA_TOPICS = {
  RIDE_REQUESTED: "ride.requested",
  RIDE_ASSIGNED: "ride.assigned",
  RIDE_STATUS_CHANGED: "ride.status_changed",
  RIDE_COMPLETED: "ride.completed",
  PAYMENT_PROCESSED: "payment.processed",
} as const;
