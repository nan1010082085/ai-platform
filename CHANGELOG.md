# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Code execution node for workflows (JavaScript sandbox)
- Variable assignment node for workflows
- Multi-branch conditional node (switch-case extension)
- Workflow import/export (JSON DSL)
- Conversation share links
- Prompt template library
- Frontend telemetry and error monitoring
- i18n support (zh-CN and en-US)

### Changed
- Improved long conversation performance with virtual scrolling
- Enhanced monitoring dashboard with node-level metrics

## [1.0.0] - 2026-07-22

### Added
- **AI Chat System**: LangGraph-based multi-expert conversational Agent with WebSocket streaming
- **Agent Workflow**: n8n-style visual DAG editor with 16 built-in templates
- **RAG Knowledge Base**: Document vectorization and retrieval-augmented generation
- **Plugin Center**: Expert/Skill/Tool/MCP configuration with hot-reload
- **External Integration**: REST API and Webhook invocation for published workflows
- **Model Management**: Provider/Model two-tier structure with BYOK support
- **Authentication**: JWT-based unified auth across editor/flow/ai
- **Monitoring**: Agent execution metrics and plugin performance tracking

### Workflow Nodes
- LLM node with configurable model and prompts
- Document parsing node with OCR support
- Vision analysis node for image understanding
- Conditional logic node (if/else)
- Human-in-the-loop (HITL) node
- Tool invocation node (LangGraph tools)
- MCP server integration node
- Agent-loop node (LLM autonomous cycling)
- Intent router node
- Requirement analyzer node
- Task planner node
- Task chain node
- Collaboration router node
- Summarizer node

### Plugin System
- Expert configuration (JSON-based)
- Skill assembly with locale support
- Tool registry with label/category validation
- MCP server integration
- Plugin marketplace with security audit
- Plugin pack specification v1 with HMAC-SHA256 signing

### Infrastructure
- Docker Compose all-in-one deployment
- MongoDB 8 database
- WebSocket real-time communication
- REST API with OpenAPI documentation
- Multi-tenant support with quota/rate limiting

## [0.9.0] - 2026-07-14

### Added
- LangGraph conversation node whiteboxing (Phase J)
- Provider/Model two-tier structure (Phase K)
- Message component refactoring (Phase L)
- Chat preview enhancements (Phase M)

### Changed
- Merged `ai/shared` into `shared/platform-shared/ai/`
- Removed deprecated `@ai-sdk` and `@schema-platform/workflow-client` packages
- Unified invoke endpoint (`POST /api/ai/workflows/invoke/{slug}`)

## [0.8.0] - 2026-07-07

### Added
- Five-phase iteration completion:
  - Workflow terminology standardization
  - Skills production configuration
  - AI internal navigation
  - Chat × Workflow WebSocket integration
  - Documentation synchronization

### Changed
- Removed HTTP SSE for Chat (WebSocket only)
- Unified pluginExpert node for all Chat agents

## [0.7.0] - 2026-06-28

### Added
- Initial AI project migration from monorepo
- Project-level CLAUDE.md creation
- qiankun micro-frontend integration
- Production deployment support

---

## Release Notes

### Version 1.0.0 - Production Ready

This is the first stable release of Schema Platform AI, featuring:

1. **Complete AI Application Platform**: Chat, Workflow, RAG, Plugins, and Integration
2. **Visual Workflow Editor**: Drag-and-drop DAG with 14+ node types
3. **Plugin Ecosystem**: Expert/Skill/Tool/MCP extensibility
4. **Enterprise Features**: Multi-tenant, quota management, rate limiting
5. **Open Source Ready**: MIT License, comprehensive documentation, Docker deployment

### Upgrade Guide

#### From 0.9.x to 1.0.0

1. Update environment variables:
   - Add `CREDENTIAL_SECRET` for credential encryption
   - Configure `REDIS_URL` for rate limiting (optional)

2. Database migration:
   - Run `pnpm db:seed` to populate Provider/Model data

3. Plugin migration:
   - Review plugin configurations in `config/plugins/`
   - Update custom plugins to use new pack specification

#### From 0.8.x to 0.9.0

1. Package updates:
   - Replace `ai/shared` imports with `@schema-platform/platform-shared/ai`
   - Remove `@ai-sdk` and `@schema-platform/workflow-client` dependencies

2. API changes:
   - Use `POST /api/ai/workflows/invoke/{slug}` instead of `/api/ai/open/*`
   - Update authentication to use JWT tokens

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
