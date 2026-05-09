export interface AuthUser {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  businessUnitId?: string | null;
}
