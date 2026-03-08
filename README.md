# ProClinic - Clinic Management System

A modern, full-stack clinic management system built with React, Node.js, and MongoDB.

## Project Structure

```
ProClinic/
├── frontend/          # React + TypeScript frontend application
│   ├── src/          # Source code
│   ├── public/       # Static assets
│   └── package.json  # Frontend dependencies
├── backend/          # Node.js + Express backend API
│   ├── config/       # Configuration files
│   ├── controllers/  # Route controllers
│   ├── models/       # Database models
│   ├── routes/       # API routes
│   ├── middleware/   # Custom middleware
│   └── server.js     # Entry point
└── SETUP.md          # Detailed setup instructions
```

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)

### Backend Setup

```bash
cd backend
npm install
npm run seed    # Create test user
npm run dev     # Start server on http://localhost:5000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev     # Start dev server on http://localhost:5173
```

### Test Login Credentials
- **Default User:** Email: `varun@gmail.com` / Password: `varun123` (auto-created on server start)
- **Admin User:** Email: `admin@proclinic.com` / Password: `admin123`

## Features

- 🔐 Secure JWT authentication
- 👤 Role-based access control (doctor, receptionist, admin, nurse)
- 🎨 Modern, responsive UI with Tailwind CSS
- 🗄️ MongoDB database integration
- 🔒 Password hashing with bcrypt
- 🌐 RESTful API architecture

## Documentation

See [SETUP.md](./SETUP.md) for detailed setup instructions and troubleshooting.

## Tech Stack

### Frontend
- React 19
- TypeScript
- Tailwind CSS v4
- Vite

### Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- JWT Authentication
- bcryptjs

## License

Private project
