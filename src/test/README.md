# Testing Framework

ParSaveables v2 uses **Vitest** + **React Testing Library** for comprehensive testing.

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode (recommended for development)
npm test -- --watch

# Run tests with UI (visual test runner)
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Test Structure

```
src/
├── test/
│   ├── setup.js              # Global test setup
│   ├── testUtils.jsx         # Shared test utilities
│   └── README.md             # This file
├── utils/
│   ├── playerUtils.js
│   └── playerUtils.test.js   # Unit tests
├── components/
│   ├── leaderboard/
│   │   ├── PodiumDisplay.jsx
│   │   └── PodiumDisplay.test.jsx  # Component tests
└── services/
    ├── api.js
    └── api.test.js           # Service/API tests
```

## Writing Tests

### Unit Tests (Utilities, Services)

```javascript
import { describe, it, expect } from 'vitest'
import { myFunction } from './myModule'

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction('input')
    expect(result).toBe('expected')
  })
})
```

### Component Tests

```javascript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyComponent from './MyComponent'

it('should render and respond to clicks', async () => {
  const user = userEvent.setup()
  render(<MyComponent />)

  expect(screen.getByText('Hello')).toBeInTheDocument()

  await user.click(screen.getByRole('button'))
  expect(screen.getByText('Clicked')).toBeInTheDocument()
})
```

### Using Test Utilities

```javascript
import { renderWithRouter, mockPlayer, createMockSupabaseClient } from '@/test/testUtils'

it('should render with router', () => {
  renderWithRouter(<MyComponent />)
  // Component can now use useNavigate, Link, etc.
})
```

## What to Test

### ✅ DO Test:
- **Utility functions**: Pure logic, transformations
- **Component behavior**: User interactions, conditional rendering
- **API services**: Data fetching, error handling
- **Business logic**: Calculations, validations

### ❌ DON'T Test:
- Implementation details (internal state)
- Third-party libraries (Supabase, React Router)
- Static markup (unless critical for UX)

## Test Coverage Goals

- **Critical paths**: 90%+ (auth, scoring, PULP economy)
- **Utilities**: 80%+
- **Components**: 70%+
- **Overall**: 75%+

## Mocking

### Mock Supabase

```javascript
import { vi } from 'vitest'
import { createMockSupabaseClient } from '@/test/testUtils'

vi.mock('@/services/supabase', () => ({
  supabase: createMockSupabaseClient(),
}))
```

### Mock React Router

```javascript
import { renderWithRouter } from '@/test/testUtils'

renderWithRouter(<MyComponent />)
```

## Best Practices

1. **Test behavior, not implementation**
2. **Keep tests simple and focused**
3. **Use descriptive test names**
4. **Arrange-Act-Assert pattern**
5. **Mock external dependencies**
6. **Test edge cases and error states**

## Debugging Tests

```bash
# Run specific test file
npm test playerUtils.test

# Run tests matching pattern
npm test -- --grep "should render"

# Debug with console.log
npm test -- --reporter=verbose
```

## CI/CD Integration

Tests run automatically on:
- Pre-commit hooks (future)
- Pull requests (future)
- Deployment pipeline (future)

---

**Framework:** Vitest + React Testing Library + Happy DOM
**Coverage:** Istanbul (c8)
**Assertions:** Vitest (Jest-compatible API)
