# Quick Start Guide

Get Schema Platform AI up and running in 5 minutes.

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 20.x ([Download](https://nodejs.org/))
- **pnpm** >= 9.x (`npm install -g pnpm`)
- **MongoDB** 8.x ([Download](https://www.mongodb.com/try/download/community))
- **Git** ([Download](https://git-scm.com/))

### Optional

- **Docker** - For containerized deployment
- **LLM API Key** - DeepSeek (recommended), OpenAI, or Anthropic

---

## Option 1: Local Development Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/nan1010082085/ai-platform.git
cd ai-platform
```

### Step 2: Install Dependencies

```bash
# Install shared package (required)
cd shared/platform-shared
pnpm install
pnpm build
cd ../..

# Install server
cd server
pnpm install
cd ..

# Install AI app
cd ai/app
pnpm install
cd ../..
```

### Step 3: Configure Environment

```bash
# Copy environment template
cp server/.env.example server/.env

# Edit with your settings
nano server/.env  # or use your preferred editor
```

**Minimum required settings:**

```env
MONGODB_URI=mongodb://formgrid:formgrid@localhost:27017/formgrid
JWT_SECRET=your-random-32-byte-hex-string
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
```

### Step 4: Start MongoDB

```bash
# Using Docker (recommended)
cd server
pnpm db:up
cd ..

# Or start MongoDB manually
mongod --dbpath /path/to/data
```

### Step 5: Seed the Database

```bash
cd server
pnpm db:seed
cd ..
```

This populates the database with:
- Default admin user
- Sample workflows
- Plugin configurations
- Provider/Model presets

### Step 6: Start the Application

**Terminal 1 - Server:**

```bash
cd server
pnpm dev
```

Server starts at `http://localhost:3001`

**Terminal 2 - AI App:**

```bash
cd ai/app
pnpm dev
```

AI app starts at `http://localhost:5300`

### Step 7: Access the Application

1. Open `http://localhost:5300` in your browser
2. Login with default credentials:
   - Email: `admin@example.com`
   - Password: `admin123`
3. Start using the AI platform!

---

## Option 2: Docker Compose Setup

The fastest way to get started with zero local setup.

### Step 1: Clone and Configure

```bash
git clone https://github.com/nan1010082085/ai-platform.git
cd ai-platform

# Copy environment template
cp ai/.env.example ai/.env
```

### Step 2: Edit Environment

```bash
nano ai/.env
```

**Required settings:**

```env
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
JWT_SECRET=your-random-32-byte-hex-string
```

### Step 3: Start All Services

```bash
docker compose -f ai/docker-compose.ai.yml up -d
```

This starts:
- MongoDB (port 27017)
- API Server (port 3001)
- AI Frontend (port 5300)

### Step 4: Access the Application

Open `http://localhost:5300` in your browser.

### Docker Commands

```bash
# View logs
docker compose -f ai/docker-compose.ai.yml logs -f

# Stop services
docker compose -f ai/docker-compose.ai.yml down

# Restart services
docker compose -f ai/docker-compose.ai.yml restart

# Rebuild and start
docker compose -f ai/docker-compose.ai.yml up -d --build
```

---

## Verify Installation

### Check Server Health

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-07-23T00:00:00.000Z"
}
```

### Run Tests

```bash
# AI app tests
cd ai/app
pnpm test

# Server tests
cd server
pnpm test
```

### Check Test Coverage

```bash
cd ai/app
pnpm test:coverage
```

---

## Next Steps

### Explore Features

1. **AI Chat** - Start a conversation with the AI assistant
2. **Workflow Designer** - Create visual workflows
3. **RAG Knowledge Base** - Upload documents for context
4. **Plugin Center** - Configure experts and tools
5. **Model Settings** - Add custom LLM providers

### Read Documentation

- **[Architecture Overview](./architecture.md)** - System design
- **[Agent System](./agent.md)** - Chat experts
- **[Workflow Guide](./agent-workflow.md)** - Visual workflows
- **[Plugin System](./plugin.md)** - Extensibility
- **[API Reference](../server/docs/api-reference.md)** - REST API

### Configure LLM Providers

Add additional LLM providers in **Settings → Model Settings**:

- **DeepSeek** - Default, recommended
- **OpenAI** - GPT-4, GPT-3.5
- **Anthropic** - Claude models
- **Custom** - Any OpenAI-compatible API

---

## Troubleshooting

### Common Issues

#### MongoDB Connection Failed

```bash
# Check if MongoDB is running
docker ps | grep mongo

# Restart MongoDB
cd server && pnpm db:up
```

#### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>
```

#### Build Errors

```bash
# Clean and rebuild
cd shared/platform-shared
rm -rf node_modules dist
pnpm install
pnpm build

cd ../../ai/app
rm -rf node_modules
pnpm install
```

#### Test Failures

```bash
# Clear test cache
cd ai/app
pnpm test -- --clearCache
```

### Getting Help

1. **Check Documentation** - Most answers are in the docs
2. **Search Issues** - Look for similar problems
3. **Ask in Discussions** - Community can help
4. **Open an Issue** - Report bugs with reproduction steps

---

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://formgrid:formgrid@localhost:27017/formgrid` |
| `JWT_SECRET` | Secret for JWT tokens | `your-random-32-byte-hex-string` |
| `DEEPSEEK_API_KEY` | DeepSeek API key | `sk-...` |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |
| `REDIS_URL` | - | Redis URL for caching |

See [Environment Variables](./environment-variables.md) for complete reference.

---

## Development Workflow

### Daily Development

```bash
# Start development servers
cd server && pnpm dev &
cd ai/app && pnpm dev

# Run tests before committing
cd ai/app && pnpm test

# Check code quality
pnpm lint
```

### Making Changes

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make your changes
3. Run tests: `pnpm test`
4. Commit: `git commit -m "feat: add my feature"`
5. Push: `git push origin feat/my-feature`
6. Create a Pull Request

---

**Congratulations!** You're now ready to develop with Schema Platform AI. Happy coding! 🚀
