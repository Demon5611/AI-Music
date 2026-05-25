export interface AuthIdentity {
  userId: string;
  email: string;
  name: string | null;
}

export interface AuthVerifier {
  verify(token: string): Promise<AuthIdentity | null>;
}
