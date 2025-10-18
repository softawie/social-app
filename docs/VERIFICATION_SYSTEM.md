# Verification System Documentation

This document explains the dual verification system (OTP + Token) implemented in the social app backend.

## Overview

The application now supports two verification methods:
1. **OTP (One-Time Password)** - Traditional 6-digit code sent via email
2. **Token-based** - Secure URL with embedded token for one-click verification

## Features

### 1. Signup Verification
Users can choose their preferred verification method during signup.

**OTP Method (Default):**
```json
POST /auth/signup
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "verificationMethod": "otp"  // Optional, defaults to OTP
}
```

**Token Method:**
```json
POST /auth/signup
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "verificationMethod": "token"
}
```

### 2. Email Confirmation

**OTP Verification:**
```json
PATCH /auth/confirm-email
{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Token Verification (Manual):**
```json
PATCH /auth/confirm-email
{
  "email": "john@example.com",
  "token": "ABC123XYZ789..."
}
```

**Token Verification (One-Click via URL):**
```
GET /auth/verify-email?token=ABC123XYZ789...&email=john@example.com
```
This endpoint is used when users click the verification link in their email. It automatically verifies the email and shows a beautiful success page with:
- ✅ Welcome message and confirmation
- 🎉 Account activation status
- 🔗 Button to redirect to your application
- 📱 Mobile-responsive design
- ⏰ Auto-redirect after 10 seconds (optional)

**Error Handling:** If verification fails, users see a styled error page explaining what went wrong and providing options to try again or contact support.

### 3. Password Reset

**Request Reset (OTP):**
```json
POST /auth/forget-password
{
  "email": "john@example.com",
  "verificationMethod": "otp"  // Optional, defaults to OTP
}
```

**Request Reset (Token):**
```json
POST /auth/forget-password
{
  "email": "john@example.com",
  "verificationMethod": "token"
}
```

**Reset Password (OTP):**
```json
POST /auth/reset-password
{
  "userId": "user_id_here",
  "email": "john@example.com",
  "code": "123456",
  "password": "newPassword123"
}
```

**Reset Password (Token):**
```json
POST /auth/reset-password
{
  "email": "john@example.com",
  "token": "ABC123XYZ789...",
  "password": "newPassword123"
}
```

### 4. Token Validation

Check if a token is valid before showing forms:

```json
POST /auth/verify-token?type=confirm_email
{
  "email": "john@example.com",
  "token": "ABC123XYZ789..."
}
```

```json
POST /auth/verify-token?type=reset_password
{
  "email": "john@example.com",
  "token": "ABC123XYZ789..."
}
```

## Email Templates

### OTP-Only Emails (`verificationMethod: "otp"` or default)
- Uses template with 6-digit code only
- Subject: "Confirm Email" or "Reset Password"
- Contains the OTP code for manual entry
- Single verification method

### Token Emails (`verificationMethod: "token"`)
- **Shows BOTH options in a single email**
- **Option 1: Click the Button** - One-click verification via secure URL
- **Option 2: Use Code** - Manual entry of 6-digit OTP code
- Users can choose their preferred method from the same email
- 24-hour expiration notice for the verification link
- Fallback text URL for accessibility
- Both verification methods work for the same request

## Security Features

### Token Security
- **64-character random tokens** using secure alphabet
- **Automatic expiration** (24 hours default)
- **One-time use** - tokens are marked as used after verification
- **Email binding** - tokens are tied to specific email addresses
- **Type-specific** - separate tokens for email confirmation vs password reset

### Database Features
- **MongoDB TTL indexes** for automatic cleanup of expired tokens
- **Compound indexes** for efficient queries
- **Automatic invalidation** of old tokens when new ones are created

### Validation
- Prevents using both OTP and token in the same request
- Validates token format and expiration
- Checks email ownership before token verification

## Frontend Integration

### Token-based Flow
1. User clicks verification link in email
2. Frontend extracts token and email from URL parameters
3. Frontend calls `/auth/verify-token` to validate token
4. If valid, show appropriate form (confirm email or reset password)
5. Submit form with token instead of OTP

### OTP Flow (Existing)
1. User receives email with 6-digit code
2. User manually enters code in frontend form
3. Frontend submits code via existing endpoints

## Environment Variables

Make sure these are set in your `.env` file:
```env
APP_URL=http://localhost:3000  # Base URL for generating verification links
```

## Database Models

### User Model Updates
- Existing `confirmEmailOtp` field remains for OTP method
- Existing `forgetPasswordOtp` field remains for OTP method
- No changes needed to user schema

### New VerificationToken Model
```typescript
{
  token: string;           // 64-character secure token
  email: string;           // Associated email address
  type: 'confirm_email' | 'reset_password';
  expiresAt: Date;         // Automatic expiration
  used: boolean;           // One-time use flag
  userId?: ObjectId;       // Optional user reference
}
```

## Migration Notes

- **Backward Compatible**: Existing OTP functionality remains unchanged
- **Default Behavior**: OTP is still the default method if not specified
- **Gradual Adoption**: Users can choose their preferred method
- **No Breaking Changes**: All existing API endpoints work as before

## Error Handling

Common error responses:
- `400`: "Please provide either OTP code or verification token"
- `400`: "Invalid token type. Must be 'confirm_email' or 'reset_password'"
- `401`: "Invalid or expired verification token"
- `401`: "Invalid OTP code"
- `401`: "User not found or Email already confirmed"

## Testing

### Test OTP Flow
1. Register with `verificationMethod: "otp"`
2. Check email for 6-digit code
3. Confirm with `/auth/confirm-email` using `otp` field

### Test Token Flow
1. Register with `verificationMethod: "token"`
2. Check email for verification link
3. Extract token from URL
4. Confirm with `/auth/confirm-email` using `token` field

## Performance Considerations

- **Automatic Cleanup**: Expired tokens are automatically removed by MongoDB TTL
- **Efficient Queries**: Compound indexes optimize token lookups
- **Memory Efficient**: Tokens are stored in database, not memory
- **Scalable**: Works across multiple server instances

## Security Best Practices

1. **Always use HTTPS** in production for verification URLs
2. **Set appropriate APP_URL** for your environment
3. **Monitor token usage** for suspicious activity
4. **Regular cleanup** of old verification records
5. **Rate limiting** on verification endpoints (recommended)
