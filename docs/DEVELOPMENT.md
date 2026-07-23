# Development Guide

This guide covers the development setup, architecture, and best practices for contributing to Schema Platform AI.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Debugging](#debugging)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

Schema Platform AI follows a modular architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Vue 3 SPA)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  AI Chat    │  │  Workflow   │  │  Plugin     │         │
│  │  Panel      │  │  Designer   │  │  Center     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                           │
                    REST API + WebSocket
                           │
┌─────────────────────────────────────────────────────────────┐
│                    API Server (Koa.js)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  LangGraph  │  │  Workflow   │  │  Plugin     │         │
│  │  Engine     │  │  Executor   │  │  Registry   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                    MongoDB 8 + Vector Store
```

### Key Components

1. **AI Chat** - LangGraph-based conversational agent
2. **Workflow Designer** - Visual DAG editor for workflows
3. **Plugin Center** - Expert/Skill/Tool/MCP configuration
4. **RAG Engine** - Document vectorization and retrieval
5. **Model Manager** - LLM provider configuration

---

## Development Setup

### Prerequisites

```bash
# Node.js 20+
node --version  # Should be v20.x or higher

# pnpm 9+
pnpm --version  # Should be 9.x or higher

# MongoDB 8
mongod --version  # Should be 8.x

# Git
git --version
```

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/nan1010082085/ai-platform.git
cd ai-platform

# 2. Install dependencies
cd shared/platform-shared && pnpm install && pnpm build && cd ../..
cd server && pnpm install && cd ..
cd ai/app && pnpm install && cd ../..

# 3. Configure environment
cp server/.env.example server/.env
# Edit server/.env with your settings

# 4. Start MongoDB
cd server && pnpm db:up && cd ..

# 5. Seed database
cd server && pnpm db:seed && cd ..

# 6. Start development servers
# Terminal 1:
cd server && pnpm dev

# Terminal 2:
cd ai/app && pnpm dev
```

### IDE Setup

**Recommended: VS Code**

Install these extensions:
- Vue - Official (Volar)
- ESLint
- Prettier
- TypeScript Vue Plugin (Volar)

**Settings.json:**

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "vue.server.useSecondServer": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

---

## Project Structure

```
ai-platform/
├── ai/                          # AI application
│   ├── app/                     # Vue 3 frontend
│   │   ├── src/
│   │   │   ├── api/             # API clients
│   │   │   ├── components/      # Vue components
│   │   │   ├── composables/     # Vue composables
│   │   │   ├── constants/       # Constants
│   │   │   ├── stores/          # Pinia stores
│   │   │   ├── types/           # TypeScript types
│   │   │   ├── utils/           # Utilities
│   │   │   └── views/           # Page components
│   │   ├── __tests__/           # Test files
│   │   └── package.json
│   └── docs/                    # Documentation
├── shared/
│   └── platform-shared/         # Shared package
│       └── ai/                  # AI types & events
├── server/                      # Backend server
│   ├── src/
│   │   ├── ai/                  # AI logic
│   │   ├── models/              # MongoDB models
│   │   ├── routes/              # API routes
│   │   └── middleware/          # Koa middleware
│   └── package.json
└── docs/                        # Project documentation
```

### Key Directories

#### `ai/app/src/api/`

API client modules. Each file handles a specific domain:

- `aiApi.ts` - Chat, documents, LLM, monitor, RAG
- `agentWorkflowApi.ts` - Workflow operations
- `modelApi.ts` - Model management
- `providerApi.ts` - Provider management
- `pluginApi.ts` - Plugin operations

#### `ai/app/src/stores/`

Pinia stores for global state:

- `chat.ts` - Chat conversations
- `agentWorkflowDesigner.ts` - Workflow designer state
- `modelSettings.ts` - Model configuration
- `plugin.ts` - Plugin state

#### `ai/app/src/composables/`

Reusable Vue composables:

- `useModelCenter.ts` - Model selection logic
- `useChatScroll.ts` - Chat scroll behavior
- `useWorkflowExecution.ts` - Workflow execution

#### `server/src/ai/`

AI-specific server logic:

- `runtime/` - LangGraph runtime modules
- `routes/` - AI API routes
- `services/` - Business logic
- `agents/` - Chat agent implementations

---

## Coding Standards

### TypeScript

```typescript
// ✅ Good: Explicit types
interface User {
  id: string
  name: string
  email: string
}

function getUser(id: string): Promise<User> {
  // ...
}

// ❌ Bad: Using any
function getUser(id: any): any {
  // ...
}
```

### Vue 3 Composition API

```vue
<script setup lang="ts">
// ✅ Good: Composition API with TypeScript
import { ref, computed } from 'vue'

interface Props {
  title: string
  count?: number
}

const props = withDefaults(defineProps<Props>(), {
  count: 0
})

const doubled = computed(() => props.count * 2)
</script>
```

### Composables

```typescript
// ✅ Good: Reusable composable
export function useCounter(initialValue = 0) {
  const count = ref(initialValue)
  
  const increment = () => count.value++
  const decrement = () => count.value--
  const reset = () => count.value = initialValue
  
  return {
    count: readonly(count),
    increment,
    decrement,
    reset
  }
}
```

### API Clients

```typescript
// ✅ Good: Type-safe API client
export async function getConversation(id: string): Promise<Conversation> {
  const response = await apiClient.get(`/api/ai/conversations/${id}`)
  return response.data
}

// ❌ Bad: Direct fetch in component
const data = await fetch('/api/ai/conversations/123')
```

### Error Handling

```typescript
// ✅ Good: Proper error handling
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  console.error('Operation failed:', error)
  throw new Error(`Failed to complete operation: ${error.message}`)
}

// ❌ Bad: Silent error swallowing
try {
  await riskyOperation()
} catch (error) {
  // Silence!
}
```

---

## Testing

### Running Tests

```bash
# Run all tests
cd ai/app && pnpm test

# Run tests in watch mode
cd ai/app && pnpm test -- --watch

# Run tests with coverage
cd ai/app && pnpm test:coverage

# Run specific test file
cd ai/app && pnpm test -- src/__tests__/chat.spec.ts
```

### Writing Tests

#### Unit Tests

```typescript
// src/__tests__/useCounter.spec.ts
import { describe, it, expect } from 'vitest'
import { useCounter } from '../composables/useCounter'

describe('useCounter', () => {
  it('should initialize with default value', () => {
    const { count } = useCounter()
    expect(count.value).toBe(0)
  })

  it('should initialize with custom value', () => {
    const { count } = useCounter(10)
    expect(count.value).toBe(10)
  })

  it('should increment', () => {
    const { count, increment } = useCounter()
    increment()
    expect(count.value).toBe(1)
  })
})
```

#### Component Tests

```typescript
// src/__tests__/MyComponent.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MyComponent from '../components/MyComponent.vue'

describe('MyComponent', () => {
  it('should render correctly', () => {
    const wrapper = mount(MyComponent, {
      props: {
        title: 'Test'
      }
    })
    
    expect(wrapper.text()).toContain('Test')
  })
})
```

### Test Coverage

Coverage thresholds are enforced:

- **Statements**: >= 70%
- **Branches**: >= 70%
- **Functions**: >= 70%
- **Lines**: >= 70%

View coverage report:

```bash
cd ai/app && pnpm test:coverage
open coverage/index.html
```

---

## Debugging

### Frontend Debugging

1. **Browser DevTools**
   - Open Chrome DevTools (F12)
   - Use Vue DevTools extension
   - Check Console for errors
   - Inspect Network requests

2. **VS Code Debugger**

   Create `.vscode/launch.json`:

   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "type": "chrome",
         "request": "launch",
         "name": "Debug Vue App",
         "url": "http://localhost:5300",
         "webRoot": "${workspaceFolder}/ai/app/src"
       }
     ]
   }
   ```

### Backend Debugging

1. **Console Logging**

   ```typescript
   console.log('Debug:', { variable })
   console.error('Error:', error)
   ```

2. **VS Code Debugger**

   Create `.vscode/launch.json`:

   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "type": "node",
         "request": "launch",
         "name": "Debug Server",
         "program": "${workspaceFolder}/server/src/index.ts",
         "outFiles": ["${workspaceFolder}/server/dist/**/*.js"],
         "env": {
           "NODE_ENV": "development"
         }
       }
     ]
   }
   ```

### Common Debug Scenarios

#### WebSocket Issues

```typescript
// Check WebSocket connection
socket.on('connect', () => {
  console.log('Connected:', socket.id)
})

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason)
})

socket.on('connect_error', (error) => {
  console.error('Connection error:', error)
})
```

#### API Errors

```typescript
// Check API responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    })
    return Promise.reject(error)
  }
)
```

---

## Common Tasks

### Adding a New API Endpoint

1. **Define the route** in `server/src/routes/`:

   ```typescript
   // server/src/routes/myFeature.ts
   import Router from '@koa/router'
   
   const router = new Router({ prefix: '/api/ai/my-feature' })
   
   router.get('/', async (ctx) => {
     ctx.body = { message: 'Hello' }
   })
   
   export default router
   ```

2. **Add the API client** in `ai/app/src/api/`:

   ```typescript
   // ai/app/src/api/myFeatureApi.ts
   import { apiClient } from './shared/apiClient'
   
   export async function getMyFeature(): Promise<MyFeature> {
     const response = await apiClient.get('/api/ai/my-feature')
     return response.data
   }
   ```

3. **Create a store** if needed:

   ```typescript
   // ai/app/src/stores/myFeature.ts
   import { defineStore } from 'pinia'
   import { getMyFeature } from '../api/myFeatureApi'
   
   export const useMyFeatureStore = defineStore('myFeature', {
     state: () => ({
       data: null as MyFeature | null
     }),
     actions: {
       async fetch() {
         this.data = await getMyFeature()
       }
     }
   })
   ```

### Adding a New Vue Component

1. **Create the component**:

   ```vue
   <!-- ai/app/src/components/MyComponent.vue -->
   <script setup lang="ts">
   interface Props {
     title: string
   }
   
   const props = defineProps<Props>()
   </script>
   
   <template>
     <div :class="$style.container">
       <h2>{{ title }}</h2>
     </div>
   </template>
   
   <style module>
   .container {
     padding: 16px;
   }
   </style>
   ```

2. **Add tests**:

   ```typescript
   // ai/app/src/__tests__/MyComponent.spec.ts
   import { describe, it, expect } from 'vitest'
   import { mount } from '@vue/test-utils'
   import MyComponent from '../components/MyComponent.vue'
   
   describe('MyComponent', () => {
     it('should render title', () => {
       const wrapper = mount(MyComponent, {
         props: { title: 'Test' }
       })
       expect(wrapper.text()).toContain('Test')
     })
   })
   ```

### Adding a New Workflow Node

1. **Define the node type** in `server/src/ai/`:

   ```typescript
   // server/src/ai/nodes/myNode.ts
   export async function executeMyNode(
     input: MyNodeInput,
     context: ExecutionContext
   ): Promise<MyNodeOutput> {
     // Implementation
   }
   ```

2. **Register the node** in the executor:

   ```typescript
   // server/src/ai/agentWorkflowExecutor.ts
   case 'my-node':
     return await executeMyNode(input, context)
   ```

3. **Add the frontend panel**:

   ```vue
   <!-- ai/app/src/components/agent-workflow/property-panel/panels/MyNodePanel.vue -->
   <script setup lang="ts">
   // Node configuration UI
   </script>
   ```

4. **Register in the palette**:

   ```typescript
   // ai/app/src/constants/agentNodes.ts
   {
     type: 'my-node',
     label: 'My Node',
     icon: 'my-icon',
     category: 'Custom'
   }
   ```

---

## Troubleshooting

### Build Errors

#### TypeScript Errors

```bash
# Check TypeScript configuration
cd ai/app && npx tsc --noEmit

# Fix common issues
# 1. Missing types: Install @types/xxx
# 2. Import errors: Check import paths
# 3. Type assertions: Use proper types
```

#### Vite Build Errors

```bash
# Clear cache and rebuild
cd ai/app
rm -rf node_modules/.vite
pnpm dev
```

### Test Failures

#### Mock Issues

```typescript
// ✅ Good: Proper mocking
vi.mock('../api/myApi', () => ({
  getData: vi.fn().mockResolvedValue({ data: 'test' })
}))

// ❌ Bad: Incomplete mock
vi.mock('../api/myApi')
```

#### Async Test Issues

```typescript
// ✅ Good: Wait for async operations
it('should load data', async () => {
  const wrapper = mount(MyComponent)
  await wrapper.vm.$nextTick()
  expect(wrapper.text()).toContain('Loaded')
})
```

### Runtime Errors

#### WebSocket Connection Issues

```bash
# Check server is running
curl http://localhost:3001/api/health

# Check WebSocket endpoint
wscat -c ws://localhost:3001
```

#### Database Connection Issues

```bash
# Check MongoDB is running
mongosh --eval "db.stats()"

# Check connection string
echo $MONGODB_URI
```

---

## Resources

### Documentation

- [Vue 3 Documentation](https://vuejs.org/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Koa Documentation](https://koajs.com/)
- [MongoDB Documentation](https://www.mongodb.com/docs/)

### Tools

- [Vue DevTools](https://devtools.vuejs.org/)
- [VS Code](https://code.visualstudio.com/)
- [MongoDB Compass](https://www.mongodb.com/products/compass)

### Community

- [GitHub Discussions](https://github.com/nan1010082085/ai-platform/discussions)
- [GitHub Issues](https://github.com/nan1010082085/ai-platform/issues)

---

**Happy coding!** 🚀
