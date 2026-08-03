# MERN Stack Modular RBAC System

A modular role-based access control (RBAC) platform built with MongoDB, Express, React, and Vite. The application supports three primary roles: Admin, Manager, and Customer, with separate dashboards, user management workflows, password change approvals, and archive/restore actions.

## Overview

This project demonstrates a practical internal-user management workflow with:
- User authentication and role-based access
- Admin and Manager user administration
- Customer profile management and security actions
- Status toggling for active/inactive accounts
- Password change approval flows routed through an Approvals collection
- Archive/restore support for soft-deleted users

## Project Structure

```text
Authentik-task-1/
├── client/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── App.css
│       ├── api/
│       │   └── fetchClient.js
│       └── components/
│           ├── ArchivedUsers.jsx
│           ├── Dashboard.jsx
│           ├── Login.jsx
│           ├── ResetPassword.jsx
│           └── UpdateProfile.jsx
├── server/
│   ├── package.json
│   ├── server.js
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   └── authController.js
│   ├── models/
│   │   ├── PasswordChangeRequest.js
│   │   └── User.js
│   ├── routes/
│   │   └── authRoutes.js
│   ├── tests/
│   │   ├── passwordChangeRequest.test.js
│   │   ├── passwordValidation.test.js
│   │   ├── roleAccess.test.js
│   │   └── statusHelpers.test.js
│   ├── utils/
│   │   ├── passwordChangeRequest.js
│   │   ├── passwordValidation.js
│   │   ├── roleAccess.js
│   │   ├── sendEmail.js
│   │   └── statusHelpers.js
└── README.md
```

## Role-Based Access Control Matrix

| Role | Can manage users | Can create users | Can view approvals | Can approve password requests | Can archive users | Can edit own profile |
| --- | --- | --- | --- | --- | --- | --- |
| Admin | Yes | Yes | Yes | Yes | Yes | Yes |
| Manager | Customers only | Customers only | Yes | Yes | Yes | Yes |
| Customer | Own account only | No | No | No | No | Yes |

## Key Features and Workflows

### 1. Status Toggling vs. Soft Delete
- Status changes only update the account status (Active/Inactive).
- Archiving is handled separately through soft-delete actions and is visible in the archived users view.
- Inactive customers remain visible in the inactive customers table until they are explicitly archived.

### 2. Approval Workflow
- Customers or Managers can request password changes.
- Requests are created in the Approvals collection with a pending status.
- Admins and Managers can review and approve or reject these requests from the dashboard queue.

### 3. UI Security and Profile Management
- The dashboard provides profile editing and password reset request flows.
- The UI keeps password actions separate from general profile updates to reduce accidental changes.
- Password fields remain isolated from standard profile edits to improve clarity and safety.

## Setup and Installation

### Prerequisites
- Node.js 18+
- npm or pnpm
- MongoDB instance (local or cloud)

### Environment Variables
Create a .env file in the server directory with values similar to:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/authentik
JWT_SECRET=replace-with-a-secure-secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@1234
CLIENT_URL=http://localhost:5173
```

### Install Dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### Run Locally

Start the backend:

```bash
cd server
npm run dev
```

Start the frontend:

```bash
cd client
npm run dev
```

Open the application at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api/v1/auth

## Development Notes

- The backend uses Express routes under server/routes and controllers under server/controllers.
- Frontend state and UI are centered in client/src/components/Dashboard.jsx.
- Tests for password requests, role access, password validation, and status helpers can be run directly through Node’s test runner.
