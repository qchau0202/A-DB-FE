# DevConnect Frontend

Frontend for **DevConnect: Social Platform for Developers** - A modern React application built with TypeScript, featuring real-time updates, rich content editing, and a responsive design.

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui + TailwindCSS
- **Icons**: Lucide React
- **Routing**: React Router
- **State Management**: React Context API
- **HTTP Client**: Fetch API

## Prerequisites

Before starting, ensure you have:
- Node.js (v18 or higher)
- npm or yarn
- The backend server running (see A-DB-BE/README.md)

## Project Setup

### 1. Install Dependencies

```bash
cd A-DB-FE
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `A-DB-FE` directory:

```bash
VITE_API_URL=http://localhost:3000/api
```

**Note:** Change `VITE_API_URL` if your backend is running on a different port or host.

### 3. Start Development Server

```bash
npm run dev
```

The frontend will start at `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### 5. Preview Production Build

```bash
npm run preview
```

## Application Features

### Authentication
- Sign up with email and password
- Sign in with existing credentials
- Sign out and session management
- Protected routes for authenticated users

### Posts
- Create posts with rich content (text, images, code)
- View posts in feed (latest, popular, active)
- Like and comment on posts
- View post details with engagement metrics

### Documents
- Create and edit collaborative documents
- Categorize documents with tags
- View document versions
- Like and comment on documents

### Quickies
- Create ephemeral stories (24h expiration)
- Upload images
- Add captions
- View quickies from followed users

### Categories
- Browse content by tags/categories
- View trending topics
- Filter by content type (posts, documents, quickies)
- Search tags

### Social Features
- Follow/unfollow other users
- View mutual connections
- See connection recommendations
- View user profiles

### Analytics
- View trending content
- See user influence scores
- Track engagement metrics

## Project Structure

```
src/
├── assets/           # Static assets (images, logos)
├── components/       # Reusable UI components
│   └── ui/          # shadcn/ui components
├── contexts/        # React contexts for state management
│   └── AuthContext.tsx  # Authentication context
├── pages/           # Page components
│   ├── AuthPage.tsx
│   ├── HomePage.tsx
│   ├── CategoriesPage.tsx
│   ├── DocumentDetailPage.tsx
│   └── ...
├── services/        # API service layer
│   ├── authService.ts
│   ├── categoryService.ts
│   └── mainServices.ts
├── types/           # TypeScript type definitions
├── App.tsx          # Main application component
└── main.tsx         # Application entry point
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:3000/api` |

## Running the Full Application

To run the complete DevConnect application:

### Terminal 1: Backend

```bash
cd A-DB-BE
npm run dev
```

Backend runs at `http://localhost:3000`

### Terminal 2: Frontend

```bash
cd A-DB-FE
npm run dev
```

Frontend runs at `http://localhost:5173`

### Access the Application

Open your browser and navigate to `http://localhost:5173`

## Default Test Users

If you seeded the database using the backend seed scripts, you can use these credentials:

- **Email**: Any user from the seed output
- **Password**: `123456`

## Troubleshooting

### Frontend Cannot Connect to Backend

1. Ensure the backend server is running at `http://localhost:3000`
2. Check `VITE_API_URL` in `.env` file
3. Verify CORS is configured correctly in the backend

### Build Errors

If you encounter build errors:

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### TypeScript Errors

Ensure all dependencies are installed:

```bash
npm install
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development Tips

- The frontend uses React Context for authentication state
- All API calls go through service layer in `services/`
- UI components are built with shadcn/ui and TailwindCSS
- The app is fully responsive and works on mobile devices

## Support

For backend setup and API documentation, see `A-DB-BE/README.md`