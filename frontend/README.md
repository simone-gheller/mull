# SafeConfig Frontend

Modern React frontend for SafeConfig - a secure configuration parameter management system.

## 🚀 Features

- **Professional Landing Page** with hero section, feature cards, and client testimonials
- **Modern Authentication** with login/registration forms and Google OAuth integration
- **Parameter Management** dashboard with search, filtering, and version control
- **User Management** interface for team administration  
- **Responsive Design** with Tailwind CSS and Framer Motion animations
- **Enterprise-Ready** architecture with protected routes and role-based access

## 🏗️ Tech Stack

- **React 18** with Vite for fast development
- **Tailwind CSS v4** for modern styling
- **Framer Motion** for smooth animations
- **React Router** for SPA navigation
- **React Hook Form + Zod** for form validation
- **Axios** for API communication

## 🎨 Design System

- **Color Palette**: Professional blue and gray tones with accent colors
- **Typography**: Inter font family for modern readability
- **Components**: Reusable UI components (Button, Input, Card, Modal, Badge)
- **Animations**: Subtle transitions and micro-interactions

## 📱 Pages

### Landing Page (`/`)
- Hero section with compelling value proposition
- Navigation menu (Solutions, Docs, Get Started, Pricing, Company)
- Feature cards highlighting key benefits
- Rolling client logo strip
- Social proof section with statistics
- Call-to-action sections

### Authentication
- **Login** (`/login`) - Email/password + Google OAuth
- **Registration** (`/register`) - Account creation + Google OAuth

### Dashboard (Protected Routes - `/dashboard`)
- **Dashboard** - Overview with project statistics and quick actions
- **Projects** - Project management with CRUD operations
- **Parameters** - Parameter listing with search and filtering
- **Parameter Detail** - Version history and value management  
- **Users** - Team member management (admin only)

## 🚦 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The application will be available at `http://localhost:5174` (or next available port).

## 🔧 Configuration

Environment variables (`.env`):
```bash
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=SafeConfig
VITE_APP_VERSION=1.0.0
```

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/          # Reusable UI components
│   ├── layout/      # Layout components
│   └── ...
├── pages/           # Page components
├── context/         # React Context providers  
├── services/        # API service layer
├── hooks/           # Custom React hooks
└── utils/           # Utility functions
```

## 🎯 Navigation Flow

**Unauthenticated Users:**
- `/` → Landing page with product information
- `/login` → Authentication form
- `/register` → Account creation

**Authenticated Users:**
- Redirected to `/dashboard` automatically
- Access to all protected routes and features

## 🔐 Authentication

The application supports:
- Email/password authentication
- Google OAuth integration (placeholder implemented)
- JWT token management with automatic refresh
- Protected route system
- Role-based access control

## ✨ Key Features

- **Smooth Animations** using Framer Motion
- **Responsive Design** that works on all devices  
- **Modern UI/UX** following current design trends
- **TypeScript Ready** architecture
- **SEO Optimized** with proper meta tags
- **Performance Optimized** with code splitting and lazy loading
