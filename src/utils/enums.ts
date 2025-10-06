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
  CONFIRM_EMAIL_TOKEN = 'confirmEmailToken',
  FORGET_PASSWORD_TOKEN = 'forgetPasswordToken',
}

export enum VerificationMethod {
  OTP = 'otp',
  TOKEN = 'token',
}

// Post-related enums
export enum PostVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  FRIENDS = 'friends',
}

export enum PostSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  LIKES = 'likes',
  COMMENTS = 'comments',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum ReportReason {
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  HATE_SPEECH = 'hate_speech',
  VIOLENCE = 'violence',
  NUDITY = 'nudity',
  FALSE_INFORMATION = 'false_information',
  COPYRIGHT = 'copyright',
  OTHER = 'other',
}

export enum ReportStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}