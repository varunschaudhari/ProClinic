# ProClinic Backend API

Node.js backend API for ProClinic clinic management system.

## Features

- User authentication with JWT
- Password hashing with bcrypt
- MongoDB database integration
- Role-based access control (doctor, receptionist, admin, nurse)
- RESTful API endpoints

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your MongoDB connection string and JWT secret
```

3. Make sure MongoDB is running on your system or use MongoDB Atlas.

4. Start the server:
```bash
npm run dev
```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication

- `POST /api/auth/login` - Login user
  - Body: `{ "email": "user@example.com", "password": "password123" }`
  - Returns: JWT token and user data

- `GET /api/auth/me` - Get current user (Protected)
  - Headers: `Authorization: Bearer <token>`

- `POST /api/auth/register` - Register new user (Protected, Admin only)
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "name": "John Doe", "email": "john@example.com", "password": "password123", "role": "doctor" }`

## Environment Variables

- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRE` - Token expiration time (default: 7d)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:5173)

## Database Schema

### User Model
- name (String, required)
- email (String, required, unique)
- password (String, required, hashed)
- role (String: doctor, receptionist, admin, nurse)
- isActive (Boolean, default: true)
- timestamps (createdAt, updatedAt)
