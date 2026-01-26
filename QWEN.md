# WebDev Orders API - Project Documentation

## Project Overview

This is a Node.js/Express server application that serves as an API for a web development orders management system. The application allows clients to submit orders for web development services, and enables managers and administrators to review, process, and track these orders.

### Key Technologies
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT tokens
- **Logging**: Winston
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting
- **File Upload**: Multer

### Architecture
- **Model-View-Controller (MVC)** pattern with controllers, services, and models
- **RESTful API** design
- **Environment-based configuration** (development, test, production)
- **Comprehensive logging** with file and console outputs

## Building and Running

### Prerequisites
- Node.js (v14 or higher recommended)
- PostgreSQL database
- Environment variables configured

### Setup Instructions

1. **Install dependencies**:
```bash
npm install
```

2. **Set up environment variables** by creating a `.env` file based on the template:
```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=webdev_orders_dev
CLIENT_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
```

3. **Run database migrations** (if any):
```bash
npm run db:migrate
```

4. **Start the development server**:
```bash
npm run dev
```

5. **Start the production server**:
```bash
npm start
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with nodemon |
| `npm run start` | Start production server |
| `npm run seed` | Populate database with test data |
| `npm run logs` | Tail combined logs |
| `npm run logs:error` | Tail error logs |
| `npm run db:create` | Create database |
| `npm run db:drop` | Drop database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:migrate:undo` | Undo last migration |
| `npm run db:seed` | Seed database with test data |
| `npm run db:seed:undo` | Remove seeded data |

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /refresh-token` - Refresh access token
- `GET /verify-email/:token` - Verify email address
- `POST /forgot-password` - Request password reset
- `POST /reset-password/:token` - Reset password
- `POST /logout` - Logout user
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `PUT /change-password` - Change password
- `GET /applications` - Get user's applications
- `GET /stats` - Get user statistics
- `DELETE /deactivate` - Deactivate account

### Applications (`/api/applications`)
- `GET /` - Get all applications (for authenticated user)
- `POST /` - Create new application
- `GET /:id` - Get specific application
- `PUT /:id` - Update application
- `DELETE /:id` - Delete application
- `POST /:id/submit` - Submit application
- `GET /:id/transitions` - Get available status transitions
- `POST /:id/files` - Upload file to application
- `GET /:id/files` - Get application files
- `DELETE /files/:fileId` - Delete file

### Admin (`/api/admin`)
- `GET /applications` - Get all applications (manager+)
- `GET /applications/:id` - Get application details (manager+)
- `PUT /applications/:id/status` - Update application status (manager+)
- `POST /applications/:id/reset-to-draft` - Reset application to draft (admin)
- `PUT /applications/:id/assign` - Assign manager to application (admin)
- `POST /applications/:id/notes` - Add internal note (manager+)
- `GET /users` - Get all users (admin)
- `PUT /users/:id/role` - Update user role (admin)
- `GET /stats/dashboard` - Get dashboard statistics (manager+)

### Health Check (`/api`)
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health check with DB connection
- `GET /test-db` - Test database connection
- `GET /version` - Get API version information

## Data Models

### User Model
- **Fields**: id, email, password_hash, full_name, phone, company_name, is_email_verified, email_verification_token, reset_password_token, reset_password_expires, role, last_login_at
- **Roles**: client, manager, admin
- **Features**: Soft delete, email verification, password hashing

### Application Model
- **Fields**: id, user_id, title, description, service_type, contact_full_name, contact_email, contact_phone, company_name, budget_range, status, internal_notes, priority, assigned_to, submitted_at
- **Statuses**: draft, submitted, in_review, needs_info, estimated, approved, in_progress, completed, cancelled
- **Service Types**: landing_page, corporate_site, ecommerce, web_application, redesign, other
- **Budget Ranges**: under_50k, 50k_100k, 100k_300k, 300k_500k, negotiable
- **Priorities**: low, normal, high, urgent

### StatusHistory Model
- Tracks status changes for applications
- Fields: id, application_id, old_status, new_status, changed_by, comment

### ApplicationFile Model
- Stores files associated with applications
- Fields: id, application_id, filename, original_name, path, size, mime_type, uploaded_by

## Security Features

1. **Authentication**: JWT-based authentication with refresh tokens
2. **Authorization**: Role-based access control (client, manager, admin)
3. **Rate Limiting**: Prevents abuse with limits on API requests
4. **Input Validation**: Comprehensive validation of all inputs
5. **SQL Injection Prevention**: Sequelize ORM protects against SQL injection
6. **Helmet**: Security headers for Express app
7. **CORS**: Configured for secure cross-origin requests
8. **Password Hashing**: bcrypt for secure password storage

## Development Conventions

1. **Code Style**: Standard JavaScript with ESLint-style formatting
2. **Error Handling**: Centralized error handling middleware
3. **Logging**: Winston logger with different log levels
4. **Environment Variables**: dotenv for configuration management
5. **Database**: PostgreSQL with Sequelize ORM
6. **Testing**: Not explicitly visible in the current codebase, but the structure supports testing

## Testing Data

The application includes a seeding script that creates test users and applications:
- Admin: admin@example.com / admin123
- Manager: manager@example.com / manager123
- Client: client@example.com / client123

Run `npm run seed` to populate the database with test data.

## Logging

The application uses Winston for logging with three different outputs:
1. Console logging (with colors)
2. Error log file (`logs/error.log`)
3. Combined log file (`logs/combined.log`)

Log levels: error, warn, info, http, debug

## Deployment Notes

For production deployment:
1. Set `NODE_ENV` to `production`
2. Configure SSL for database connections
3. Set up proper reverse proxy (nginx/Apache)
4. Configure process manager (PM2)
5. Set up monitoring and alerting
6. Ensure proper file permissions for log files