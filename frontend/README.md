# Nexus Medwell Frontend

A modern React frontend for the Nexus Medwell Hospital Management System.

## Features

- 🎨 Modern, responsive UI design
- 🔐 User authentication (Login)
- 🚀 Built with React + Vite
- 📱 Mobile-friendly interface
- ⚡ Fast development with hot module replacement

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── pages/
│   │   └── Login.jsx          # Login page component
│   ├── services/
│   │   ├── api.js              # Axios configuration
│   │   └── authService.js      # Authentication service
│   ├── App.jsx                 # Main app component with routing
│   ├── App.css                 # App styles
│   ├── main.jsx                # Entry point
│   └── index.css               # Global styles
├── index.html                  # HTML template
├── vite.config.js              # Vite configuration
└── package.json                # Dependencies

```

## API Integration

The frontend is configured to connect to the backend API at `http://localhost:3000/api`.

### Authentication

- **Login**: `POST /api/auth/login`
- **Register**: `POST /api/auth/register`
- **Logout**: `POST /api/auth/logout`

Tokens are automatically stored in localStorage and included in API requests.

## Environment Variables

You can create a `.env` file in the frontend directory for environment-specific configuration:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## Features Implemented

✅ Login page with form validation
✅ Error handling and display
✅ Password visibility toggle
✅ Loading states
✅ Responsive design
✅ Token-based authentication
✅ Automatic token injection in API requests

## Next Steps

- [ ] Create Register page
- [ ] Create Dashboard pages for Admin, Doctor, and Patient
- [ ] Add protected routes
- [ ] Implement forgot password flow
- [ ] Add email verification page

