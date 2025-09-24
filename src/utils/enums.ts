export enum EnvEnum {
  DEVELOPER = "development",
  PRODUCTION = "production",
  TEST = "test",
}


export enum providersEnum {
  GOOGLE = "google",
  LOCAL = "local",
  SYSTEM = "system",
}

export enum UserRoles {
  ADMIN = "admin",
  USER = "user",
}

export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh'
}

export enum EmailSubjects {
  CONFIRM_EMAIL = 'Confirm Email',
  RESET_PASSWORD = 'Reset Password',
  WELCOME = 'Welcome to Saraha App',
}

export enum ValidationLocation {
  Body = "body",
  Query = "query",
  Params = "params",
  Headers = "headers",
}

export enum EmailEventEnums{
  CONFIRM_EMAIL = 'confirmEmail',
  FORGET_PASSWORD = 'forgetPassword',
}