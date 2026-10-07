export interface JwtPayload {
  email: string;
  sub: string;
  userId: string;
  role?: string;
}

export interface RequestWithUser extends Request {
  user: any;
}
