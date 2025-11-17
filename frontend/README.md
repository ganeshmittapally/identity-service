# Frontend - Identity Service OAuth Provider UI

React-based frontend for the Identity Service OAuth 2.0 provider. Built with TypeScript, Vite, React Router, TailwindCSS, and Zustand.

## Tech Stack

- **Framework**: React 18.2.0 with TypeScript 5.2
- **Build Tool**: Vite 5.0 (dev server on port 3001)
- **Styling**: TailwindCSS 3.3.0 with PostCSS/Autoprefixer
- **Routing**: React Router DOM 6.18
- **State Management**: Zustand 4.4.0 (centralized auth state)
- **HTTP Client**: Axios 1.6.0 (with request/response interceptors)
- **Icons**: Lucide React 0.292.0
- **UI Utilities**: clsx 2.0.0, date-fns 2.30.0

## Project Structure

```
src/
├── components/              # Reusable UI components (Button, Modal, Card, Table, Form, etc.)
│   ├── Button.tsx          # Primary button with variants (primary, secondary, danger, ghost)
│   ├── Input.tsx           # Text input with label, error, helper text
│   ├── Modal.tsx           # Reusable modal dialog component
│   ├── Card.tsx            # Card layout with Header, Body, Footer, Title
│   ├── Alert.tsx           # Alert and Badge components
│   ├── Table.tsx           # Data table with Pagination
│   ├── Form.tsx            # Form, Select, Textarea, Checkbox components
│   ├── Layout.tsx          # Main app layout (sidebar, header, content)
│   └── index.ts            # Component exports
│
├── pages/                  # Route pages
│   ├── LoginPage.tsx       # User login
│   ├── RegisterPage.tsx    # User registration
│   ├── DashboardPage.tsx   # Dashboard overview
│   ├── ClientsPage.tsx     # OAuth clients management
│   ├── ProfilePage.tsx     # User profile and settings
│   ├── AdminPage.tsx       # Admin dashboard (admin only)
│   └── index.ts            # Page exports
│
├── hooks/                  # Custom React hooks
│   ├── useAuth.ts          # Auth hook (login, register, logout, checkAuth)
│   ├── useClients.ts       # OAuth clients hook (CRUD operations)
│   ├── useAdmin.ts         # Admin operations hook (users, clients, stats, audit)
│   └── index.ts            # Hook exports
│
├── services/               # API layer
│   └── apiClient.ts        # Axios HTTP client with interceptors and token refresh
│
├── store/                  # State management
│   └── authStore.ts        # Zustand auth store (user state, auth flow)
│
├── types/                  # TypeScript interfaces
│   └── index.ts            # User, Auth, OAuth Client, API response types
│
├── utils/                  # Utility functions (to add)
│   └── (placeholder)
│
├── App.tsx                 # Main app with routing logic
├── main.tsx                # React entry point
├── index.css               # Global styles with Tailwind
└── vite-env.d.ts          # Vite environment types

```

## Features

### Authentication
- **Login/Register**: User authentication with JWT tokens
- **Token Refresh**: Automatic access token refresh via interceptor
- **Protected Routes**: Route guards for authenticated pages
- **Logout**: Clear session and redirect to login

### OAuth Client Management
- **Create Client**: Register new OAuth applications
- **View Clients**: List all user applications with pagination
- **Update Client**: Modify client settings and URIs
- **Delete Client**: Revoke applications
- **Revoke Secrets**: Rotate client secrets

### User Management
- **Profile**: View and edit user information
- **Two-Factor Auth**: Enable/disable 2FA with QR code
- **Security Settings**: Password change, device management

### Admin Panel (Admin Only)
- **Dashboard Stats**: System overview (users, clients, health)
- **User Management**: Suspend/unsuspend users, reset attempts
- **Client Management**: Revoke secrets, delete clients
- **Audit Logs**: View admin actions and system events
- **System Config**: Update system settings

### UI Components
- **Button**: Variants (primary, secondary, danger, ghost), sizes (sm, md, lg)
- **Input**: Text input with validation, error display
- **Modal**: Dialog with footer and close button
- **Card**: Flexible card layout with header/body/footer
- **Alert**: Info, success, warning, error alerts
- **Badge**: Status badges with variants
- **Table**: Data table with custom rendering and pagination
- **Form**: Form wrapper with row layout, Select, Textarea, Checkbox

## Setup & Development

### Prerequisites
- Node.js 16+ and npm/yarn
- Backend API running on `http://localhost:3000/api`

### Installation

```bash
cd frontend
npm install
```

### Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3001`

API requests to `/api/*` are proxied to backend (`http://localhost:3000/api`)

### Build for Production

```bash
npm run build
npm run preview  # Preview production build
```

### Linting

```bash
npm run lint
```

## Environment Variables

Create `.env` or `.env.local`:

```env
VITE_API_URL=http://localhost:3000/api
```

## API Integration

### Request Interceptor
- Automatically adds `Authorization: Bearer {token}` header
- Reads token from localStorage

### Response Interceptor (Token Refresh)
- Catches 401 responses
- Attempts to refresh token via `/v1/auth/refresh`
- Retries original request with new token
- On failure, clears tokens and redirects to login
- Queues concurrent refresh requests to prevent multiple refreshes

### API Methods
- `apiClient.get<T>(url)` - GET request
- `apiClient.post<T>(url, data)` - POST request
- `apiClient.put<T>(url, data)` - PUT request
- `apiClient.patch<T>(url, data)` - PATCH request
- `apiClient.delete<T>(url)` - DELETE request

All methods return `Promise<AxiosResponse<ApiResponse<T>>>`

## State Management (Zustand)

### Auth Store (`useAuthStore()`)
- `user: User | null` - Current user
- `token: string | null` - Access token
- `isAuthenticated: boolean` - Auth state
- `isLoading: boolean` - Operation in progress
- `error: string | null` - Error message

### Actions
- `login(credentials)` - POST /v1/auth/login
- `register(credentials)` - POST /v1/auth/register
- `logout()` - Clear all auth state
- `checkAuth()` - Verify auth on app startup
- `updateUser(user)` - Update user in state
- `clearError()` - Clear error message

## Route Structure

### Public Routes
- `/login` - Login page
- `/register` - Registration page

### Protected Routes (Authenticated Users)
- `/dashboard` - Dashboard overview
- `/clients` - OAuth client management
- `/profile` - User profile and settings
- `/admin` - Admin dashboard (admin role only)

### Route Guards
App.tsx implements route guards:
- Checks `isAuthenticated` state on mount
- Redirects unauthenticated users to `/login`
- Renders loading screen during auth check
- Protects admin routes with role check

## TypeScript Types

### Core Types
- `User` - User account with role, status, 2FA flag
- `LoginCredentials` - Email and password
- `RegisterCredentials` - Email, username, password, name
- `AuthResponse` - Access/refresh tokens and user data
- `OAuthClient` - OAuth application details
- `AdminStats` - System statistics
- `AuditLog` - Admin action log

### API Types
- `ApiResponse<T>` - Generic API response wrapper
- `PaginatedResponse<T>` - Paginated list response
- `Token` - Token details with expiration

## Styling

### TailwindCSS
- Utility-first approach for responsive design
- CSS variables for brand colors (primary, success, danger, warning)
- Pre-defined utility classes (`.btn-primary`, `.form-input`, `.card`)
- Mobile-first responsive breakpoints (sm, md, lg)

### Global Styles
- CSS reset and base styles
- Custom button, form, and card styles
- Color palette with gray scale
- Smooth transitions and hover states

## Next Steps

### Phase 1 (Current - Foundation) ✅ COMPLETE
- ✅ Project setup with TypeScript, Vite, TailwindCSS
- ✅ Custom hooks (useAuth, useClients, useAdmin)
- ✅ UI component library (8+ components)
- ✅ App routing with protected routes
- ✅ Layout component (sidebar, header)
- ✅ Page stubs for all major routes

### Phase 2 (Next - Core Pages)
- [ ] Complete LoginPage with form validation
- [ ] Complete RegisterPage with strength meter
- [ ] Implement DashboardPage with real data
- [ ] Complete ClientsPage with CRUD modals
- [ ] Build ProfilePage with 2FA setup

### Phase 3 (Future - Advanced Features)
- [ ] Admin dashboard with stats charts
- [ ] User management interface
- [ ] Audit log viewer with filters
- [ ] Real-time notifications
- [ ] PWA support
- [ ] Error boundaries and logging

## Troubleshooting

### Build Errors
- Run `npm install` after `package.json` changes
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf dist && npm run build`

### API Connection Issues
- Ensure backend is running on `http://localhost:3000`
- Check `VITE_API_URL` environment variable
- Verify CORS is enabled on backend
- Check browser console for network errors

### TypeScript Errors
- Update TypeScript: `npm update typescript`
- Regenerate types: `npm run type-check`
- Ensure all imports use correct paths with `@` aliases

## Contributing

- Follow existing component patterns
- Use TypeScript strictly
- Write components as functional with hooks
- Use TailwindCSS for styling
- Keep components reusable and composable

## License

Same as backend project
