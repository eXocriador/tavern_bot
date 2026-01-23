# Security Guidelines for Production Deployment

## 🚨 Critical Security Requirements

### 1. Environment Variables

- **NEVER** commit real credentials to version control
- Use `.env.example` as template only
- Set strong, unique passwords for production
- Use different passwords for different environments

### 2. MongoDB Security

```bash
# Production: Restrict MongoDB access to localhost only
MONGO_PORT=127.0.0.1:27017

# Development: Full access (only for local dev)
MONGO_PORT=27017
```

### 3. Network Security

- MongoDB port should be accessible only from backend
- Use firewall rules to restrict access
- Consider using VPN for admin access

### 4. Docker Security

```bash
# Run containers as non-root user (add to Dockerfile)
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs
```

### 5. SSL/TLS Configuration

- Use HTTPS in production
- Configure SSL termination at reverse proxy
- Update WEB_APP_URL to use https://

## 🔧 Production Deployment Checklist

- [ ] All environment variables set with strong values
- [ ] MongoDB restricted to localhost only
- [ ] SSL/TLS configured
- [ ] Firewall rules configured
- [ ] Log monitoring set up
- [ ] Backup strategy implemented
- [ ] Security scanning performed
- [ ] Rate limiting configured
- [ ] Input validation verified

## 🛡️ Recommended Security Tools

1. **Docker Security Scanning**

   ```bash
   docker scan tavern-bot-backend
   ```

2. **Dependency Updates**

   ```bash
   yarn audit
   yarn upgrade-interactive --latest
   ```

3. **Network Monitoring**
   - Monitor unusual API access patterns
   - Set up alerts for failed authentication attempts

## 📋 Environment Variables Reference

See `.env.example` for complete list with descriptions.

## ⚠️ Important Notes

1. **Change Default Passwords**: Always change default passwords before production deployment
2. **Regular Updates**: Keep dependencies updated for security patches
3. **Access Control**: Implement proper access control mechanisms
4. **Logging**: Monitor logs for security incidents
5. **Backups**: Regular, encrypted backups of database
