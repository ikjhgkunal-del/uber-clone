export type UserRole = "customer" | "driver";

export interface AuthenticatedUser {
  userId: string;
  roles: UserRole[];
}
