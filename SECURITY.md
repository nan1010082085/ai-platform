# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

1. **DO NOT** open a public GitHub issue for security vulnerabilities
2. Email security concerns to: [INSERT SECURITY EMAIL]
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt within 48 hours
- **Assessment**: Security team will assess the vulnerability within 5 business days
- **Updates**: You will receive updates on the fix progress
- **Credit**: Security researchers will be credited in the fix announcement (unless anonymity is requested)

## Security Best Practices

### For Developers

1. **Environment Variables**
   - Never commit API keys, secrets, or credentials
   - Use `.env.example` as a template
   - Rotate keys regularly

2. **Authentication**
   - JWT tokens expire after 24 hours
   - Refresh tokens expire after 7 days
   - Use strong, random `JWT_SECRET` (32+ bytes)

3. **API Security**
   - All API endpoints require authentication (except public webhooks)
   - Rate limiting is enforced per IP and per API key
   - Input validation using Zod schemas

4. **Database Security**
   - MongoDB authentication is required in production
   - Use strong passwords for database users
   - Enable TLS for database connections

### For Deployment

1. **Docker Security**
   - Use official Docker images
   - Run containers as non-root user
   - Limit container resources (CPU, memory)
   - Use read-only filesystem where possible

2. **Network Security**
   - Use HTTPS in production
   - Configure CORS appropriately
   - Use reverse proxy (nginx) for SSL termination
   - Enable firewall rules

3. **Secrets Management**
   - Use environment variables for secrets
   - Consider using Docker secrets or Kubernetes secrets
   - Never store secrets in code or version control

## Security Features

### Built-in Security

1. **Authentication & Authorization**
   - JWT-based authentication
   - Role-based access control (RBAC)
   - API key management with scoping

2. **Input Validation**
   - Zod schema validation for all API inputs
   - SQL/NoSQL injection prevention
   - XSS protection via Content Security Policy

3. **Rate Limiting**
   - IP-based rate limiting
   - API key-based rate limiting
   - Configurable limits per endpoint

4. **Plugin Security**
   - Plugin pack signing (HMAC-SHA256)
   - Sandboxed plugin execution (planned)
   - Permission declarations for plugins

5. **Data Protection**
   - Credential encryption at rest
   - API key masking in UI
   - Audit logging for sensitive operations

### Security Configuration

```bash
# Required security environment variables
JWT_SECRET=<random-32-byte-hex-string>
CREDENTIAL_SECRET=<random-32-byte-hex-string>
MONGODB_URI=mongodb://user:password@host:27017/db?authSource=admin

# Optional security settings
CORS_ORIGINS=https://yourdomain.com
SKIP_PERMISSION_CHECK=false  # Never set to true in production
```

## Vulnerability Disclosure

### Known Security Considerations

1. **Plugin Execution**
   - External plugins run in the same process
   - Future: sandboxed execution environment
   - Mitigation: trust verification, code review

2. **LLM Integration**
   - Prompt injection attacks possible
   - Mitigation: input sanitization, output filtering
   - Best practices: validate LLM outputs

3. **File Upload**
   - Document uploads are stored locally
   - Mitigation: file type validation, size limits
   - Future: virus scanning integration

### Security Updates

Security patches are released as soon as possible after verification:

- **Critical**: Within 24 hours
- **High**: Within 72 hours
- **Medium**: Within 1 week
- **Low**: Next regular release

## Contact

For security-related questions or concerns:
- Security Email: [INSERT EMAIL]
- Security Team: [INSERT TEAM CONTACT]

For general questions:
- GitHub Issues: https://github.com/nan1010082085/ai-platform/issues
- Discussions: https://github.com/nan1010082085/ai-platform/discussions

---

**Last Updated**: 2026-07-23
