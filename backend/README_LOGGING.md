# Logging Configuration

ProClinic backend uses Winston for comprehensive logging and Morgan for HTTP request logging.

## Log Levels

- **error**: Error events that might still allow the application to continue
- **warn**: Warning messages for potentially harmful situations
- **info**: Informational messages about general application flow
- **debug**: Detailed information for debugging

## Log Files

All logs are stored in the `logs/` directory:

- `combined.log` - All logs (all levels)
- `error.log` - Error logs only
- `info.log` - Info and above logs

## Log Rotation

- Maximum file size: 5MB per log file
- Maximum files: 5 files per log type
- Automatic rotation when size limit is reached

## Log Format

### Development Mode
- Colorized console output
- Human-readable format
- Includes timestamp, level, and message

### Production Mode
- JSON format for easy parsing
- Structured data for log aggregation tools
- Includes metadata (userId, IP, etc.)

## What Gets Logged

### HTTP Requests
- All incoming requests (method, URL, IP, user agent)
- Response status codes and response times
- User ID (if authenticated)

### Authentication
- Login attempts (successful and failed)
- User registration
- Token validation

### User Management
- User creation, updates, and deletions
- Who performed the action (audit trail)
- Changes made to user data

### Errors
- Full error stack traces
- Request context (method, URL, user)
- Error metadata

### Database
- Connection status
- Default user creation

## Environment Variables

- `LOG_LEVEL` - Set log level (default: "info")
  - Options: error, warn, info, debug
- `NODE_ENV` - Environment mode
  - development: Console + file logging
  - production: File + JSON console logging

## Example Usage

```javascript
import { logInfo, logError, logWarn } from "./config/logger.js";

// Info log
logInfo("User action", { userId: "123", action: "login" });

// Error log
logError("Database error", error, { userId: "123" });

// Warning log
logWarn("Rate limit exceeded", { ip: "192.168.1.1" });
```

## Log Analysis

Logs are in JSON format in production, making them easy to:
- Parse with log aggregation tools (ELK, Splunk, etc.)
- Search and filter
- Create dashboards and alerts
- Track user activity and system health

## Security

- Passwords are never logged
- Sensitive data is excluded from logs
- User IDs are logged for audit purposes
- IP addresses are logged for security monitoring
