# Schema Platform AI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2020-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.0-brightgreen.svg)](https://vuejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.0-green.svg)](https://www.mongodb.com/)

Open-source AI application platform: conversational Agent, visual workflow orchestration, RAG knowledge base, plugin center, and external integration.

**[Documentation](./docs)** | **[Contributing](./CONTRIBUTING.md)** | **[Changelog](./CHANGELOG.md)** | **[Security](./SECURITY.md)**

---

## Quick Start (5 minutes)

Get a standalone AI platform running with **server + ai frontend** -- two terminals, no Docker required.

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- MongoDB 8 (local or Docker)
- An LLM API key (DeepSeek recommended)

### 1. Clone and install

```bash
git clone https://github.com/schema-platform/schema-platform.git
cd schema-platform

# Build shared package (required; includes AI types/events under platform-shared/ai/)
cd shared/platform-shared && pnpm install && pnpm build && cd ../..

# Install server
cd server && pnpm install && cd ..

# Install AI app
cd ai/app && pnpm install && cd ../..
```

### 2. Start MongoDB

```bash
cd server && pnpm db:up && cd ..
```

This starts MongoDB 8 on port 27017 (user: `formgrid`, password: `formgrid`, database: `formgrid`).

### 3. Configure environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env` -- set at minimum:

```env
MONGODB_URI=mongodb://formgrid:formgrid@localhost:27017/formgrid
JWT_SECRET=<any-random-hex-string-32-bytes>
DEEPSEEK_API_KEY=<your-deepseek-api-key>
```

> ⚠️ **Security Warning**: Never commit real API keys to version control. Use environment variables or `.env` files (which should be in `.gitignore`).

### 4. Seed the database (optional but recommended)

```bash
cd server && pnpm db:seed && cd ..
```

### 5. Start the server

```bash
cd server && pnpm dev
```

Server runs at `http://localhost:3001`. Verify with `curl http://localhost:3001/api/health`.

### 6. Start the AI app

```bash
cd ai/app && pnpm dev
```

Open `http://localhost:5300`. The AI chat panel connects to the server automatically.

---

## Docker Compose (all-in-one)

For the fastest experience with zero local setup:

```bash
# From the repo root
cp ai/.env.example ai/.env
# Edit ai/.env with your DEEPSEEK_API_KEY and JWT_SECRET

docker compose -f ai/docker-compose.ai.yml up -d
```

This starts MongoDB, the API server, and the AI frontend. Open http://localhost:5300 when ready.

See [docker-compose.ai.yml](./docker-compose.ai.yml) for configuration details.

---

## Architecture

```
Browser (port 5300)
  └─ ai/app (Vue 3 SPA)
       ├─ REST API ──→ server (Koa, port 3001)
       └─ WebSocket ──→ server (Socket.IO)
                           ├─ MongoDB (schemas, conversations, users, workflows)
                           ├─ LLM (DeepSeek / OpenAI / Anthropic / custom)
                           └─ RAG (embedding + vector search)
```

The AI app runs standalone or embeds in editor/flow via qiankun micro-frontend as a sidebar assistant.

---

## Project Structure

```
ai/
  app/               @ai-app                           Vue 3 frontend: Chat, Workflows, RAG, Plugins
  shared/            @schema-platform/ai-shared        Cross-package types, events, promptBuilder
  docs/              Architecture & design documentation
```

| Package | Description |
|---------|-------------|
| `@ai-app` | Full AI application: Chat, workflow designer, execution monitor, RAG, plugin center |
| `@schema-platform/platform-shared/ai` | Shared types, event protocol, prompt builder, workflow domain model |

---

## Core Capabilities

### AI Chat (LangGraph)

Multi-expert conversational Agent with requirement analysis, task planning, and tool execution. Experts are configured via the plugin center -- add new domain experts without code changes.

### Agent Workflow (Visual DAG)

n8n-style visual workflow editor. Nodes: LLM, document parsing, vision analysis, conditional logic, human-in-the-loop, tool invocation. Publish and invoke via REST API or webhook.

### RAG Knowledge Base

Index documents (PDF, Word, Excel, text) into vector store. Retrieval-augmented generation in Chat and workflows. Default embedding: SiliconFlow-hosted BGE-M3.

### Plugin Center

Configure Experts, Skills, Tools, and MCP servers via JSON. Hot-reload with SIGHUP. CLI tools for packaging and installation.

### External Integration

Invoke published workflows via HTTP with API keys:

```bash
curl -X POST http://localhost:3001/api/ai/workflows/invoke/your-workflow-slug \
  -H "X-Tenant-Id: your-tenant-id" \
  -H "X-Workflow-Key: wf_your_key" \
  -H "Content-Type: application/json" \
  -d '{"input": "your data"}'
```

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWT tokens (required in production; auto-fallback in dev) |
| `DEEPSEEK_API_KEY` | DeepSeek API key for LLM chat |

### Optional -- LLM Providers

| Variable | Default | Description |
|----------|---------|-------------|
| `DEEPSEEK_BASE_URL` | (DeepSeek default) | Custom DeepSeek endpoint |
| `DEEPSEEK_MODEL` | (provider default) | Override chat model name |
| `OPENAI_API_KEY` | -- | OpenAI API key (alternative provider) |
| `OPENAI_BASE_URL` | -- | Custom OpenAI-compatible endpoint |
| `OPENAI_MODEL` | -- | Override OpenAI model name |
| `ANTHROPIC_API_KEY` | -- | Anthropic API key |
| `ANTHROPIC_BASE_URL` | -- | Custom Anthropic endpoint |
| `CLAUDE_MODEL` | -- | Override Claude model name |
| `DEFAULT_LLM` | -- | Default provider key |
| `PLATFORM_LLM_ENABLED` | `true` | Set `false` to use only DB-stored ModelConfig |

### Optional -- Embedding (RAG)

| Variable | Default | Description |
|----------|---------|-------------|
| `EMBEDDING_API_KEY` | -- | Embedding API key |
| `EMBEDDING_BASE_URL` | `https://api.hpc-ai.com/inference/v1` | Embedding endpoint (SiliconFlow) |
| `EMBEDDING_MODEL` | `BAAI/bge-m3` | Embedding model name |
| `EMBEDDING_DIMENSIONS` | `1024` | Vector dimensions |

### Optional -- Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | `development` or `production` |
| `CORS_ORIGINS` | `*` | Allowed origins (comma-separated) |
| `CREDENTIAL_SECRET` | -- | Encryption key for stored credentials |
| `SKIP_PERMISSION_CHECK` | `false` | Skip auth checks (dev only, never in production) |
| `REDIS_URL` | -- | Redis URL (optional, for caching) |

### Optional -- AI Behavior

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_ENABLE_TASK_PLANNER` | `true` | Enable task planning node |
| `AI_DOCUMENT_STORAGE_ROOT` | -- | Root directory for document storage |
| `AI_VISION_OCR_MODEL` | -- | Model for vision/OCR tasks |
| `AI_PLUGIN_CONFIG_DIR` | -- | Plugin configuration directory |

---

## Tech Stack

- **Frontend**: Vue 3, TypeScript, Element Plus, Pinia, Vue Router, Socket.IO client
- **Backend**: Koa.js, TypeScript, Mongoose, LangGraph, Socket.IO
- **AI**: LangGraph (state graph + checkpoint), OpenAI-compatible API, MCP protocol
- **Database**: MongoDB 8+
- **Build**: Vite, TypeScript compiler

---

## Documentation

| Document | Content |
|----------|---------|
| [Architecture](./docs/architecture.md) | Dual-engine architecture, system overview |
| [Agent System](./docs/agent.md) | Chat expert agents, execution flow |
| [Agent Workflow](./docs/agent-workflow.md) | Visual workflow orchestration guide |
| [Tool System](./docs/tool.md) | MCP tools, LangGraph tools, registry |
| [MCP Protocol](./docs/mcp.md) | MCP server configuration |
| [Event Protocol](./docs/events.md) | WebSocket event types |
| [ai-shared API](./docs/ai-shared.md) | Shared package exports |
| [Plugin Center](./docs/plugin.md) | Plugin architecture and configuration |
| [SDK Guide](./docs/sdk.md) | SDK usage and external integration |
| [Platform Positioning](./docs/platform.md) | Three-capability platform, JWT, credential model |

---

## Development

```bash
# Run tests
cd ai/app && pnpm test

# Coverage (stores/api thresholds enforced)
cd ai/app && pnpm test:coverage

# Build
cd ai/app && pnpm build
cd shared/platform-shared && pnpm build
```

---

## Contributing

We welcome contributions from the community! See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, coding standards, and pull request guidelines.

### Ways to Contribute

- **Report bugs** - Use our [bug report template](https://github.com/nan1010082085/ai-platform/issues/new?template=bug_report.md)
- **Suggest features** - Use our [feature request template](https://github.com/nan1010082085/ai-platform/issues/new?template=feature_request.md)
- **Submit pull requests** - Follow our [PR guidelines](./CONTRIBUTING.md#pull-requests)
- **Improve documentation** - Help us make the docs better
- **Share feedback** - Join our [discussions](https://github.com/nan1010082085/ai-platform/discussions)

### Good First Issues

Looking for a way to contribute? Check out our [good first issues](https://github.com/nan1010082085/ai-platform/labels/good%20first%20issue) label.

---

## Community

- **GitHub Discussions** - Ask questions and share ideas
- **Issues** - Report bugs and request features
- **Pull Requests** - Contribute code changes

### Code of Conduct

Please read our [Code of Conduct](./CODE_OF_CONDUCT.md) before participating in our community.

---

## Security

For security concerns, please see our [Security Policy](./SECURITY.md).

**DO NOT** open public issues for security vulnerabilities.

---

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

### Attribution

Built with:
- [Vue.js](https://vuejs.org/) - The Progressive JavaScript Framework
- [LangGraph](https://langchain-ai.github.io/langgraph/) - Stateful LLM workflows
- [MongoDB](https://www.mongodb.com/) - Document database
- [Element Plus](https://element-plus.org/) - Vue 3 UI library
- [Socket.IO](https://socket.io/) - Real-time communication

---

## Support

- **Documentation** - Check the [docs](./docs) folder first
- **Issues** - Search [existing issues](https://github.com/nan1010082085/ai-platform/issues) before creating new ones
- **Discussions** - Use [GitHub Discussions](https://github.com/nan1010082085/ai-platform/discussions) for questions

---

**Made with ❤️ by the Schema Platform Team**
