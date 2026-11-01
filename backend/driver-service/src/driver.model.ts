export type DriverOnboardingStatus = "pending" | "approved" | "rejected" | "suspended";

export interface DriverProfile {
  id: string;
  userId: string;
  displayName: string;
  onboardingStatus: DriverOnboardingStatus;
}
