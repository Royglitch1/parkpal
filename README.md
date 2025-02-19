# ParkPal Backend API

A comprehensive backend API for the ParkPal mobile app, providing vehicle management, support ticket system, QR code generation, and user management functionalities.

## Features

- User Authentication (Login/Signup)
- Vehicle Registration Management
- QR Code Generation and Scanning
- Support Ticket System
- Real-time Notifications
- Admin Dashboard
- User Management

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- QR Code Generation
- RESTful API

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Setup Instructions

1. Clone the repository:
```bash
git clone <repository-url>
cd parkpal
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```
Edit the `.env` file with your configuration values.

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Documentation & Testing Guide

Below are all the API endpoints with test data for Postman. All responses are in JSON format.

### Authentication Endpoints

#### 1. Register User
- **URL**: POST /api/auth/signup
- **Body**:
```json
{
    "email": "john.doe@example.com",
    "password": "Password123!",
    "name": "John Doe",
    "mobileNumber": "9876543210"
}
```

#### 2. Login
- **URL**: POST /api/auth/login
- **Body**:
```json
{
    "email": "john.doe@example.com",
    "password": "Password123!"
}
```

### User Management Endpoints

#### 1. Get User Profile
- **URL**: GET /api/users/profile
- **Headers**: Authorization: Bearer {token}

#### 2. Update User Profile
- **URL**: PUT /api/users/profile
- **Headers**: Authorization: Bearer {token}
- **Body**:
```json
{
    "name": "John Doe Updated",
    "email": "john.updated@example.com",
    "mobileNumber": "9876543211"
}
```

#### 3. Delete Account
- **URL**: DELETE /api/users/profile
- **Headers**: Authorization: Bearer {token}

### Vehicle Management Endpoints

#### 1. Register New Vehicle
- **URL**: POST /api/vehicles
- **Headers**: Authorization: Bearer {token}
- **Body**:
```json
{
    "registrationNumber": "KA01MX2022",
    "registrationYear": 2022,
    "vehicleType": "4-wheeler",
    "make": "Toyota",
    "model": "Camry",
    "color": "Black"
}
```

#### 2. Get User's Vehicles
- **URL**: GET /api/vehicles
- **Headers**: Authorization: Bearer {token}

#### 3. Get Specific Vehicle
- **URL**: GET /api/vehicles/{vehicleId}
- **Headers**: Authorization: Bearer {token}

#### 4. Update Vehicle
- **URL**: PUT /api/vehicles/{vehicleId}
- **Headers**: Authorization: Bearer {token}
- **Body**:
```json
{
    "color": "Blue"
}
```

#### 5. Delete Vehicle
- **URL**: DELETE /api/vehicles/{vehicleId}
- **Headers**: Authorization: Bearer {token}

#### 6. Get Vehicle QR Code
- **URL**: GET /api/vehicles/{vehicleId}/qr
- **Headers**: Authorization: Bearer {token}

### Notification Endpoints

#### 1. Get User's Notifications
- **URL**: GET /api/notifications
- **Headers**: Authorization: Bearer {token}
- **Query Parameters**:
  - page (optional, default: 1)
  - limit (optional, default: 20)

#### 2. Mark Notification as Read
- **URL**: PATCH /api/notifications/{notificationId}/read
- **Headers**: Authorization: Bearer {token}

#### 3. Mark All Notifications as Read
- **URL**: POST /api/notifications/read-all
- **Headers**: Authorization: Bearer {token}

#### 4. Scan QR Code
- **URL**: POST /api/notifications/scan/{qrCode}
- **Headers**: Authorization: Bearer {token}
- **Body**:
```json
{
    "latitude": 12.9716,
    "longitude": 77.5946,
    "address": "MG Road, Bangalore"
}
```

#### 5. Delete Notification
- **URL**: DELETE /api/notifications/{notificationId}
- **Headers**: Authorization: Bearer {token}

### Support Ticket Endpoints

#### 1. Create Support Ticket
- **URL**: POST /api/tickets
- **Headers**: Authorization: Bearer {token}
- **Body**:
```json
{
    "subject": "Vehicle Registration Issue",
    "description": "Unable to update vehicle color",
    "category": "vehicle",
    "priority": "medium",
    "vehicleId": "vehicle_id_here"
}
```

#### 2. Get User's Tickets
- **URL**: GET /api/tickets/my-tickets
- **Headers**: Authorization: Bearer {token}
- **Query Parameters**:
  - status (optional): ["open", "in_progress", "resolved", "closed"]

#### 3. Add Comment to Ticket
- **URL**: POST /api/tickets/{ticketId}/comments
- **Headers**: Authorization: Bearer {token}
- **Body**:
```json
{
    "content": "Please check the status of my ticket"
}
```

### Admin Endpoints

#### 1. Get All Users (Admin only)
- **URL**: GET /api/users
- **Headers**: Authorization: Bearer {admin_token}

#### 2. Get Specific User (Admin only)
- **URL**: GET /api/users/{userId}
- **Headers**: Authorization: Bearer {admin_token}

#### 3. Update User Status (Admin only)
- **URL**: PATCH /api/users/{userId}/status
- **Headers**: Authorization: Bearer {admin_token}
- **Body**:
```json
{
    "isActive": false
}
```

#### 4. Manage Support Ticket (Admin only)
- **URL**: PATCH /api/tickets/{ticketId}/status
- **Headers**: Authorization: Bearer {admin_token}
- **Body**:
```json
{
    "status": "in_progress",
    "resolution": "Working on the issue"
}
```

## API Response Samples

### Successful Response Sample
```json
{
    "message": "Operation successful",
    "data": {
        // Response data here
    }
}
```

### Error Response Sample
```json
{
    "message": "Error message here",
    "error": "Detailed error information"
}
```

## Error Handling

The API uses standard HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Security

- JWT-based authentication
- Password hashing using bcrypt
- Input validation and sanitization
- Role-based access control
- Environment variable configuration
- CORS protection

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the ISC License.