# ProClinic Setup Guide

Complete setup guide for ProClinic clinic management system.

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

## Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
   - The `.env` file is already created with default values
   - Update `MONGODB_URI` if using MongoDB Atlas or different connection string
   - Change `JWT_SECRET` to a secure random string in production

4. **Start MongoDB:**
   - If using local MongoDB, make sure it's running:
   ```bash
   # Windows (if installed as service, it should auto-start)
   # Or use MongoDB Compass to start
   
   # Mac/Linux
   mongod
   ```

5. **Seed test users (optional):**
```bash
npm run seed
```
This creates test users:
- Email: `varun@gmail.com` / Password: `varun123` (Default user - created automatically on server start)
- Email: `admin@proclinic.com` / Password: `admin123`

**Note:** The default user (`varun@gmail.com`) is automatically created when the server starts if it doesn't exist.

6. **Start the backend server:**
```bash
npm run dev
```

The backend API will run on `http://localhost:5000`

## Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the development server:**
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Testing the Login

1. Make sure both backend and frontend servers are running
2. Open `http://localhost:5173` in your browser
3. Use the test credentials:
   - **Default User:** Email: `varun@gmail.com` / Password: `varun123` (auto-created on server start)
   - **Admin User:** Email: `admin@proclinic.com` / Password: `admin123`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)
- `POST /api/auth/register` - Register new user (Protected, Admin only)

### Health Check
- `GET /` - API status
- `GET /api/health` - Server health check

## Project Structure

```
ProClinic/
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── App.tsx       # Login page component
│   │   ├── main.tsx      # Entry point
│   │   └── index.css     # Global styles
│   ├── public/           # Static assets
│   ├── index.html        # HTML template
│   ├── vite.config.ts    # Vite configuration
│   ├── tsconfig.json      # TypeScript config
│   └── package.json      # Frontend dependencies
├── backend/              # Node.js backend API
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   └── authController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   └── User.js
│   ├── routes/
│   │   └── authRoutes.js
│   ├── scripts/
│   │   └── seedUser.js
│   ├── utils/
│   │   └── generateToken.js
│   ├── .env
│   ├── package.json
│   └── server.js
└── SETUP.md              # This file
```

## Troubleshooting

### MongoDB Connection Error
- Make sure MongoDB is running
- Check the `MONGODB_URI` in `.env` file
- For MongoDB Atlas, ensure your IP is whitelisted

### CORS Error
- Check `FRONTEND_URL` in backend `.env` matches your frontend URL
- Default is `http://localhost:5173`

### Port Already in Use
- Change `PORT` in backend `.env` file
- Update frontend API URL in `src/App.tsx` if you change the port

## Next Steps

- Create dashboard page after successful login
- Add more API endpoints (patients, appointments, etc.)
- Implement role-based routing
- Add password reset functionality
- Set up production environment variables
