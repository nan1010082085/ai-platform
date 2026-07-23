# Deployment Guide

This guide covers deploying Schema Platform AI to various environments.

---

## Table of Contents

- [Deployment Options](#deployment-options)
- [Docker Deployment](#docker-deployment)
- [Manual Deployment](#manual-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Production Checklist](#production-checklist)
- [Monitoring](#monitoring)
- [Backup & Recovery](#backup--recovery)

---

## Deployment Options

| Option | Best For | Complexity | Scalability |
|--------|----------|------------|-------------|
| Docker Compose | Development, Small teams | Low | Limited |
| Docker + External Services | Production | Medium | Good |
| Kubernetes | Enterprise, High availability | High | Excellent |
| Cloud Managed | Serverless, Auto-scaling | Medium | Excellent |

---

## Docker Deployment

### Quick Start (Docker Compose)

```bash
# Clone repository
git clone https://github.com/nan1010082085/ai-platform.git
cd ai-platform

# Configure environment
cp ai/.env.example ai/.env
# Edit ai/.env with your settings

# Start services
docker compose -f ai/docker-compose.ai.yml up -d
```

### Docker Compose Configuration

```yaml
# ai/docker-compose.ai.yml
version: '3.8'

services:
  mongodb:
    image: mongo:8
    container_name: ai-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: formgrid
      MONGO_INITDB_ROOT_PASSWORD: formgrid
      MONGO_INITDB_DATABASE: formgrid
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"

  server:
    build:
      context: ../server
      dockerfile: Dockerfile
    container_name: ai-server
    restart: unless-stopped
    environment:
      MONGODB_URI: mongodb://formgrid:formgrid@mongodb:27017/formgrid
      JWT_SECRET: ${JWT_SECRET}
      DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}
      NODE_ENV: production
    ports:
      - "3001:3001"
    depends_on:
      - mongodb

  ai-app:
    build:
      context: ../ai/app
      dockerfile: Dockerfile
    container_name: ai-app
    restart: unless-stopped
    ports:
      - "5300:80"
    depends_on:
      - server

volumes:
  mongodb_data:
```

### Environment Variables

Create `ai/.env`:

```env
# Required
JWT_SECRET=your-random-32-byte-hex-string
DEEPSEEK_API_KEY=sk-your-deepseek-api-key

# Optional
MONGODB_URI=mongodb://formgrid:formgrid@mongodb:27017/formgrid
NODE_ENV=production
CORS_ORIGINS=https://yourdomain.com
```

### Docker Commands

```bash
# Start services
docker compose -f ai/docker-compose.ai.yml up -d

# View logs
docker compose -f ai/docker-compose.ai.yml logs -f

# Stop services
docker compose -f ai/docker-compose.ai.yml down

# Restart services
docker compose -f ai/docker-compose.ai.yml restart

# Rebuild and start
docker compose -f ai/docker-compose.ai.yml up -d --build

# View running containers
docker compose -f ai/docker-compose.ai.yml ps
```

---

## Manual Deployment

### Prerequisites

- Node.js 20+
- pnpm 9+
- MongoDB 8+
- nginx (for reverse proxy)
- PM2 (for process management)

### Build Application

```bash
# 1. Clone repository
git clone https://github.com/nan1010082085/ai-platform.git
cd ai-platform

# 2. Install dependencies
cd shared/platform-shared && pnpm install && pnpm build && cd ../..
cd server && pnpm install && cd ..
cd ai/app && pnpm install && cd ../..

# 3. Build for production
cd ai/app && pnpm build
cd ../../server && pnpm build
```

### Configure Environment

```bash
# Server environment
cd server
cp .env.example .env.production

# Edit with production values
nano .env.production
```

**Production environment variables:**

```env
# Database
MONGODB_URI=mongodb://username:password@host:27017/database?authSource=admin

# Security
JWT_SECRET=your-strong-random-secret
CREDENTIAL_SECRET=your-credential-encryption-secret

# Server
PORT=3001
NODE_ENV=production
CORS_ORIGINS=https://yourdomain.com

# LLM
DEEPSEEK_API_KEY=sk-your-api-key
```

### Start with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start server
cd server
pm2 start dist/index.js --name ai-server

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

### Configure nginx

```nginx
# /etc/nginx/sites-available/ai-platform
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    location / {
        root /path/to/ai-platform/ai/app/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/ai-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Cloud Deployment

### AWS

#### Using EC2

1. Launch EC2 instance (t3.medium or larger)
2. Install Node.js, pnpm, MongoDB
3. Follow [Manual Deployment](#manual-deployment)
4. Configure security groups (ports 80, 443, 3001)

#### Using ECS (Docker)

```json
{
  "family": "ai-platform",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "server",
      "image": "your-registry/ai-server:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "MONGODB_URI",
          "value": "mongodb://..."
        }
      ]
    }
  ]
}
```

### Google Cloud

#### Using Cloud Run

```bash
# Build and push Docker image
gcloud builds submit --tag gcr.io/PROJECT_ID/ai-server

# Deploy to Cloud Run
gcloud run deploy ai-server \
  --image gcr.io/PROJECT_ID/ai-server \
  --platform managed \
  --port 3001 \
  --set-env-vars "MONGODB_URI=mongodb://..." \
  --allow-unauthenticated
```

### Azure

#### Using App Service

```bash
# Create App Service
az webapp create \
  --resource-group myResourceGroup \
  --plan myAppServicePlan \
  --name ai-platform \
  --deployment-container-image-name your-registry/ai-server:latest

# Configure environment
az webapp config appsettings set \
  --resource-group myResourceGroup \
  --name ai-platform \
  --settings MONGODB_URI="mongodb://..."
```

---

## Production Checklist

### Security

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Strong JWT_SECRET (32+ random bytes)
- [ ] Strong CREDENTIAL_SECRET (32+ random bytes)
- [ ] MongoDB authentication enabled
- [ ] CORS configured for production domain
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] API keys rotated regularly

### Performance

- [ ] MongoDB indexes created
- [ ] Connection pooling configured
- [ ] Caching enabled (Redis recommended)
- [ ] Static assets served via CDN
- [ ] Gzip compression enabled
- [ ] Image optimization enabled

### Monitoring

- [ ] Health check endpoint configured
- [ ] Error tracking enabled (Sentry, etc.)
- [ ] Logging configured
- [ ] Metrics collection enabled
- [ ] Alerting configured

### Backup

- [ ] Database backup scheduled
- [ ] Backup retention policy defined
- [ ] Backup restoration tested
- [ ] Disaster recovery plan documented

### Scaling

- [ ] Horizontal scaling planned
- [ ] Load balancer configured
- [ ] Session store externalized (Redis)
- [ ] File storage externalized (S3, etc.)

---

## Monitoring

### Health Check

```bash
# Server health
curl http://localhost:3001/api/health

# Expected response
{
  "status": "ok",
  "timestamp": "2026-07-23T00:00:00.000Z",
  "uptime": 12345
}
```

### Logging

```bash
# PM2 logs
pm2 logs ai-server

# Docker logs
docker compose logs -f server

# Application logs location
/var/log/ai-platform/
```

### Metrics

Key metrics to monitor:

- **Response Time**: API endpoint latency
- **Error Rate**: 4xx/5xx responses
- **Throughput**: Requests per second
- **Database**: Connection count, query time
- **Memory**: Heap usage, garbage collection
- **CPU**: Usage percentage

### Alerting

Set up alerts for:

- Server downtime
- High error rate (>5%)
- High response time (>2s)
- Database connection failures
- High memory usage (>80%)
- High CPU usage (>80%)

---

## Backup & Recovery

### Database Backup

```bash
# Manual backup
mongodump --uri="mongodb://formgrid:formgrid@localhost:27017/formgrid" --out=/backup/$(date +%Y%m%d)

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backup/$(date +%Y%m%d_%H%M%S)"
mongodump --uri="mongodb://formgrid:formgrid@localhost:27017/formgrid" --out=$BACKUP_DIR
# Upload to S3 or other storage
aws s3 sync $BACKUP_DIR s3://your-bucket/backups/
```

### Restore

```bash
# Restore from backup
mongorestore --uri="mongodb://formgrid:formgrid@localhost:27017/formgrid" /backup/20260723
```

### Backup Schedule

| Backup Type | Frequency | Retention |
|-------------|-----------|-----------|
| Full | Daily | 7 days |
| Incremental | Hourly | 24 hours |
| Weekly | Weekly | 30 days |
| Monthly | Monthly | 1 year |

---

## Troubleshooting

### Common Issues

#### Server Won't Start

```bash
# Check logs
pm2 logs ai-server

# Check port availability
lsof -i :3001

# Check environment variables
cat .env.production
```

#### Database Connection Issues

```bash
# Test connection
mongosh --eval "db.stats()"

# Check MongoDB status
sudo systemctl status mongod

# Check connection string
echo $MONGODB_URI
```

#### WebSocket Issues

```bash
# Check WebSocket endpoint
wscat -c wss://yourdomain.com/socket.io

# Check nginx configuration
sudo nginx -t
```

#### Performance Issues

```bash
# Check server resources
top
free -h
df -h

# Check MongoDB performance
mongosh --eval "db.currentOp()"
```

---

## Support

For deployment issues:

1. Check [Troubleshooting](#troubleshooting)
2. Search [GitHub Issues](https://github.com/nan1010082085/ai-platform/issues)
3. Ask in [GitHub Discussions](https://github.com/nan1010082085/ai-platform/discussions)

---

**Last Updated**: 2026-07-23
