export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  name: string;
}

export interface JwtConfig {
  secret: string;
  tokenAudience?: string;
  tokenIssuer?: string;
  accessTokenTtl: number;
  refreshTokenTtl: number;
}

export interface AppConfig {
  app_port: number;
  environment: string;
  database: DatabaseConfig;
  jwt: JwtConfig;
}
