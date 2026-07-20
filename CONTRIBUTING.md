# Contributing to Schema Platform AI

Thank you for your interest in contributing. This guide covers development setup, coding standards, and the pull request process.

---

## Development Setup

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- MongoDB 8 (Docker recommended: `cd server && pnpm db:up`)
- Git

### Get Started

```bash
# 1. Fork and clone
git clone https://github.com/<your-username>/schema-platform.git
cd schema-platform

# 2. Install shared package (includes AI types/events under platform-shared/ai/)
cd shared/platform-shared && pnpm install && pnpm build && cd ../..

# 3. Install server and AI app
cd server && pnpm install && cd ..
cd ai/app && pnpm install && cd ../..

# 4. Configure environment
cp server/.env.example server/.env
# Edit server/.env with your MongoDB URI, JWT_SECRET, and LLM API key

# 5. Start development
# Terminal 1: server
cd server && pnpm dev

# Terminal 2: AI app
cd ai/app && pnpm dev
```

### Run Tests

```bash
cd ai/app && pnpm test
cd ai/app && pnpm test:coverage
cd server && pnpm test
```

---

## Project Layout

```
ai/
  app/               Vue 3 frontend (Chat, Workflows, RAG, Plugins)
  docs/              Documentation
shared/
  platform-shared/   Platform-wide shared components, utilities, and AI types (ai/)
server/              Koa.js + MongoDB backend
```

---

## Coding Standards

### General

- **TypeScript strict mode** -- no `any` without documented justification
- **No silent error swallowing** -- errors must surface, not be caught and ignored
- **No cross-project modifications** -- changes to `server/` must come from server context, changes to `ai/` from ai context
- **API calls in `src/api/`** -- components and stores must not call `fetch()` directly

### Frontend (ai/app)

- **Vue 3 Composition API** -- use `setup()` or `<script setup>`, no Options API
- **Pinia for global state** -- no Vuex, no reactive globals
- **Composables for shared logic** -- `useXxx()` pattern, not scattered utils
- **Icons via AppIcon** -- do not import `@element-plus/icons-vue` directly; register icons in `platform-shared/utils/iconRegistry.ts`
- **CSS Modules** -- scoped styles via `<style module>`

### Backend (server)

- **Koa middleware pattern** -- async/await, no callback hell
- **Zod for validation** -- validate input at API boundaries
- **Mongoose models in `src/models/`** -- one file per model

### Shared Packages

- **No reverse dependencies** -- `ai-shared` must not import from `ai/app` or `server`
- **Build before test** -- `pnpm build` in shared packages before consumers can use them

---

## Git Workflow

### Branch Naming

- `feat/<short-description>` -- new features
- `fix/<short-description>` -- bug fixes
- `docs/<short-description>` -- documentation only
- `refactor/<short-description>` -- code restructuring

### Commits

- Use conventional commit format: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Keep commits focused -- one logical change per commit
- Write commit messages that explain *why*, not just *what*

### Pull Requests

1. Create a feature branch from `main`
2. Make your changes with clear, atomic commits
3. Run tests: `pnpm test` in affected packages
4. Push and open a PR against `main`
5. Fill in the PR template with:
   - What changed and why
   - How to test
   - Screenshots (for UI changes)
6. Request review from a maintainer

### Documentation

**Code changes that move, rename, or delete paths must update docs in the same PR.**

- Keep README / CONTRIBUTING / `docs/` path references in sync with the real tree
- AI domain types live in `shared/platform-shared/ai/` (import `@schema-platform/platform-shared/ai`). Do not reintroduce removed package directories under `ai/`.
- Before opening a PR, run: `node scripts/check-doc-paths.mjs`

### Before Submitting

- [ ] Tests pass (`pnpm test` in affected packages)
- [ ] Coverage passes (`pnpm test:coverage` in `ai/app`)
- [ ] Doc path check passes (`node scripts/check-doc-paths.mjs`)
- [ ] No TypeScript errors (`pnpm build` in affected packages)
- [ ] No cross-project modifications (check `git diff` only touches expected files)
- [ ] New icons registered in `iconRegistry.ts` if applicable
- [ ] Environment variables documented in `.env.example` if added

---

## Reporting Issues

- Use GitHub Issues
- Include reproduction steps, expected behavior, actual behavior
- Include environment info (Node version, OS, browser)
- For security issues, email the maintainers directly -- do not open a public issue

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
