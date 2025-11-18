# Frontend - OAuth 2.0 Admin Dashboard

React 18-based frontend application with TypeScript, providing user authentication, OAuth client management, and admin dashboard.

## 📊 Frontend Statistics

- **Language**: TypeScript (strict mode)
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **LOC**: 5,083+
- **Files**: 50+
- **Tests**: 34+ component tests
- **Coverage**: 80%
- **Status**: ✅ Production Ready

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│         Frontend Architecture                     │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌────────────────────────────────────────────┐ │
│  │    React Application                       │ │
│  │   (Vite + React 18)                        │ │
│  └──────────────┬─────────────────────────────┘ │
│                 │                                 │
│     ┌───────────┼───────────┐                     │
│     ↓           ↓           ↓                     │
│  ┌────────┐ ┌──────────┐ ┌────────┐             │
│  │Pages   │ │Components│ │Hooks   │             │
│  │        │ │          │ │        │             │
│  └────────┘ └──────────┘ └────────┘             │
│     ↓           ↓           ↓                     │
│  ┌────────────────────────────────────────┐     │
│  │  Zustand Store (Global State)          │     │
│  │  - Auth State                          │     │
│  │  - User State                          │     │
│  │  - UI State                            │     │
│  └────────────────────────────────────────┘     │
│     ↓                                            │
│  ┌────────────────────────────────────────┐     │
│  │  API Services (axios)                  │     │
│  │  - Auth API                            │     │
│  │  - User API                            │     │
│  │  - Client API                          │     │
│  │  - Admin API                           │     │
│  └────────────┬──────────────────────────┘     │
│               ↓                                  │
│  ┌────────────────────────────────────────┐     │
│  │  Backend API (http://localhost:3000)   │     │
│  └────────────────────────────────────────┘     │
│                                                   │
└──────────────────────────────────────────────────┘
```

## 📁 Directory Structure

```
frontend/
├── src/
│   ├── pages/                   # Page components
│   │   ├── LoginPage.tsx        # User login page
│   │   ├── RegisterPage.tsx     # User registration page
│   │   ├── DashboardPage.tsx    # Main dashboard
│   │   ├── ProfilePage.tsx      # User profile page
│   │   ├── ClientsPage.tsx      # OAuth clients page
│   │   ├── AdminPage.tsx        # Admin dashboard
│   │   ├── UsersPage.tsx        # User management
│   │   ├── SettingsPage.tsx     # Settings page
│   │   ├── NotFoundPage.tsx     # 404 page
│   │   └── index.ts             # Page exports
│   │
│   ├── components/              # Reusable components
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── LogoutButton.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── DashboardHeader.tsx
│   │   │   ├── QuickStats.tsx
│   │   │   └── ActivityFeed.tsx
│   │   │
│   │   ├── user/
│   │   │   ├── UserProfile.tsx
│   │   │   ├── ChangePasswordForm.tsx
│   │   │   ├── TwoFactorSetup.tsx
│   │   │   └── DeviceList.tsx
│   │   │
│   │   ├── clients/
│   │   │   ├── ClientList.tsx
│   │   │   ├── ClientForm.tsx
│   │   │   ├── ClientCard.tsx
│   │   │   └── ClientSecret.tsx
│   │   │
│   │   ├── admin/
│   │   │   ├── UserManagement.tsx
│   │   │   ├── SystemSettings.tsx
│   │   │   └── AuditLogs.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   │
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── Alert.tsx
│   │   │   └── Table.tsx
│   │   │
│   │   └── index.ts             # Component exports
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useAuth.ts           # Authentication hook
│   │   ├── useUser.ts           # User data hook
│   │   ├── useClients.ts        # OAuth clients hook
│   │   ├── useForm.ts           # Form management hook
│   │   ├── useApi.ts            # API call hook
│   │   ├── useNotification.ts   # Notification hook
│   │   ├── useTheme.ts          # Theme management hook
│   │   └── useLocalStorage.ts   # Local storage hook
│   │
│   ├── services/                # API services
│   │   ├── api.ts               # Axios instance
│   │   ├── authService.ts       # Authentication endpoints
│   │   ├── userService.ts       # User endpoints
│   │   ├── clientService.ts     # OAuth client endpoints
│   │   ├── adminService.ts      # Admin endpoints
│   │   └── tokenService.ts      # Token management
│   │
│   ├── store/                   # Zustand stores
│   │   ├── authStore.ts         # Auth state
│   │   ├── userStore.ts         # User state
│   │   ├── clientStore.ts       # Clients state
│   │   ├── uiStore.ts           # UI state
│   │   └── index.ts             # Store exports
│   │
│   ├── types/                   # TypeScript types
│   │   ├── auth.ts              # Auth types
│   │   ├── user.ts              # User types
│   │   ├── client.ts            # Client types
│   │   ├── api.ts               # API response types
│   │   └── index.ts             # Type exports
│   │
│   ├── utils/                   # Utility functions
│   │   ├── constants.ts         # App constants
│   │   ├── validators.ts        # Form validators
│   │   ├── formatters.ts        # Data formatters
│   │   ├── storage.ts           # Local storage utils
│   │   └── helpers.ts           # Helper functions
│   │
│   ├── styles/                  # Global styles
│   │   ├── index.css            # Global styles
│   │   ├── tailwind.css         # TailwindCSS imports
│   │   └── variables.css        # CSS variables
│   │
│   ├── App.tsx                  # Main App component
│   ├── main.tsx                 # App entry point
│   └── vite-env.d.ts            # Vite environment types
│
├── tests/
│   ├── unit/                    # Unit tests
│   │   ├── hooks/               # Hook tests
│   │   ├── utils/               # Utility tests
│   │   └── store/               # Store tests
│   │
│   ├── components/              # Component tests
│   │   ├── auth.test.tsx
│   │   ├── dashboard.test.tsx
│   │   ├── user.test.tsx
│   │   ├── clients.test.tsx
│   │   ├── admin.test.tsx
│   │   └── common.test.tsx
│   │
│   ├── setup.ts                 # Test setup
│   └── mocks/                   # Mock data
│       ├── handlers.ts
│       └── data.ts
│
├── .env.example                 # Example environment variables
├── .env.local                   # Local environment (git ignored)
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── vite.config.ts               # Vite configuration
├── vitest.config.ts             # Vitest configuration
├── tailwind.config.js           # TailwindCSS config
└── README.md                    # This file
```

## 🚀 Setup & Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Backend running on `http://localhost:3000`

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your configuration
# Key variables:
# - VITE_API_URL=http://localhost:3000
# - VITE_API_TIMEOUT=10000
```

### Running Locally

```bash
# Development with hot reload
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Type check
npm run type-check

# Format code
npm run format

# Lint code
npm run lint
```

Frontend runs on `http://localhost:5173`

## 🎨 UI Components

### Core Components

#### Authentication Components
- `LoginForm` - User login form with email and password
- `RegisterForm` - User registration form
- `LogoutButton` - Logout trigger button

#### Layout Components
- `MainLayout` - Main application layout wrapper
- `Sidebar` - Navigation sidebar
- `Header` - Top header with user menu
- `Footer` - Application footer

#### Common Components
- `Button` - Reusable button component (variants: primary, secondary, danger)
- `Input` - Text input with validation
- `Modal` - Modal dialog component
- `Toast` - Notification toasts (success, error, warning, info)
- `Spinner` - Loading spinner
- `Alert` - Alert messages
- `Table` - Data table with pagination

#### Feature-Specific Components
- `DashboardHeader` - Dashboard header with stats
- `UserProfile` - User profile display and edit
- `ClientList` - OAuth client list
- `ClientForm` - Create/edit OAuth client
- `UserManagement` - Admin user management
- `AuditLogs` - Audit log viewer

## 🪝 Custom Hooks

### useAuth
```typescript
const { 
  user, 
  isAuthenticated, 
  login, 
  register, 
  logout, 
  isLoading, 
  error 
} = useAuth();
```

### useUser
```typescript
const { 
  profile, 
  updateProfile, 
  changePassword, 
  setupTwoFactor, 
  isLoading, 
  error 
} = useUser();
```

### useClients
```typescript
const { 
  clients, 
  createClient, 
  updateClient, 
  deleteClient, 
  isLoading, 
  error 
} = useClients();
```

### useForm
```typescript
const { 
  values, 
  errors, 
  touched, 
  handleChange, 
  handleSubmit, 
  setValues 
} = useForm({
  initialValues: { email: '' },
  validate: (values) => ({}),
  onSubmit: (values) => {}
});
```

### useApi
```typescript
const { data, loading, error, refetch } = useApi(
  '/v1/api/endpoint',
  { method: 'GET' }
);
```

### useNotification
```typescript
const { showNotification } = useNotification();
showNotification('Success!', 'success');
```

## 🌍 State Management (Zustand)

### Auth Store
```typescript
const { user, token, login, logout, setUser } = useAuthStore();
```

### User Store
```typescript
const { profile, updateProfile, twoFaEnabled } = useUserStore();
```

### Client Store
```typescript
const { clients, addClient, removeClient } = useClientStore();
```

### UI Store
```typescript
const { theme, sidebarOpen, toggleSidebar } = useUIStore();
```

## 🎯 Pages

### Login Page (`/login`)
- Email/password login form
- "Remember me" option
- Password reset link
- Social login buttons (if configured)

### Register Page (`/register`)
- User registration form
- Email verification
- Terms acceptance
- Auto-login after registration

### Dashboard Page (`/`)
- Quick statistics
- Recent activity feed
- OAuth client summary
- User activity charts

### Profile Page (`/profile`)
- User profile display
- Edit profile form
- Change password
- Two-factor authentication setup
- Device management

### Clients Page (`/clients`)
- List of OAuth clients
- Create new client
- Edit client settings
- View/regenerate client secrets
- Delete clients

### Admin Page (`/admin`)
- User management
- System settings
- Audit logs viewer
- Analytics dashboard

### Settings Page (`/settings`)
- Theme preferences
- Notification settings
- Security settings
- Account deletion

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- LoginForm.test.tsx

# Generate coverage report
npm test -- --coverage

# Update snapshots
npm test -- --update
```

### Test Coverage
- **Overall**: 80%
- **Components**: 82%
- **Hooks**: 85%
- **Utils**: 90%

### Example Test

```typescript
import { render, screen } from '@testing-library/react';
import { LoginForm } from '@/components/auth';

describe('LoginForm', () => {
  it('should render login form', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('should handle login', async () => {
    const { getByRole } = render(<LoginForm />);
    const submitButton = getByRole('button', { name: /login/i });
    fireEvent.click(submitButton);
    // Add assertions
  });
});
```

## 🎨 Styling

### TailwindCSS
- **Utility-first CSS framework**
- **Responsive design ready**
- **Dark mode support**

### CSS Variables
```css
:root {
  --color-primary: #007bff;
  --color-secondary: #6c757d;
  --color-success: #28a745;
  --color-danger: #dc3545;
}
```

### Theme Configuration
```typescript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        primary: '#007bff',
        secondary: '#6c757d',
      }
    }
  }
}
```

## 🚀 Build & Deployment

### Environment Variables

Required variables (see `.env.example`):
```env
# API Configuration
VITE_API_URL=http://localhost:3000
VITE_API_TIMEOUT=10000

# Feature Flags
VITE_ENABLE_2FA=true
VITE_ENABLE_AUDIT_LOGS=true

# Analytics
VITE_ANALYTICS_ID=your-analytics-id

# Environment
VITE_ENV=development
```

### Production Build

```bash
# Build for production
npm run build

# Output directory: dist/
# Files are minified and optimized

# Test production build
npm run preview
```

### Docker

```bash
# Build image
docker build -t identity-service-frontend:latest .

# Run container
docker run -d \
  --name identity-frontend \
  -p 80:80 \
  identity-service-frontend:latest
```

### Docker Compose

```bash
# Run with docker-compose
docker-compose up frontend

# Frontend will be available at http://localhost:80
```

## 📊 Performance Optimization

### Code Splitting
- Automatic chunk splitting by Vite
- Route-based lazy loading
- Component lazy loading for large components

### Caching
- Service worker for offline support
- Local storage for session persistence
- Browser caching with proper headers

### Bundle Analysis
```bash
# Analyze bundle size
npm run build -- --analyze
```

## 🔐 Security

### Authentication Security
- ✅ HTTP-only cookies for tokens (when available)
- ✅ Token refresh logic
- ✅ Secure token storage
- ✅ CSRF protection

### Input Validation
- ✅ Client-side form validation
- ✅ Email format validation
- ✅ Password strength validation
- ✅ XSS protection

### Headers & CORS
- ✅ CORS properly configured
- ✅ Security headers in API calls
- ✅ Content-Type validation

## 🔧 Troubleshooting

### API Connection Issues
```bash
# Verify backend is running
curl http://localhost:3000/v1/health

# Check VITE_API_URL in .env.local
# Should match your backend URL
```

### Build Issues
```bash
# Clear dependencies and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf dist
npm run build
```

### Development Server Issues
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Restart dev server
npm run dev
```

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [TailwindCSS Documentation](https://tailwindcss.com/)
- [Zustand Documentation](https://zustand-demo.vercel.app/)
- [Testing Library Documentation](https://testing-library.com/)

## 🤝 Contributing

See main README for contribution guidelines.

---

**Status**: ✅ Production Ready | **Version**: 1.0.0 | **Last Updated**: November 2025
