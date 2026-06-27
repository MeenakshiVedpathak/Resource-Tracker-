# RUT Portal - Resource Utilization Tracking System

A full-stack web application for tracking employee resource utilization across service POs, sub-projects, and clients. RUT Portal enables HR, Finance, Division Heads, Project Managers, and Management to monitor timesheets, costs, and utilization reports in a centralized platform.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Default Credentials](#default-credentials)
- [Project Structure](#project-structure)
- [Module Descriptions](#module-descriptions)
- [Role Permissions Matrix](#role-permissions-matrix)
- [Timesheet Import Template](#timesheet-import-template)

---

## Project Overview

RUT Portal is designed to help organizations track:

- **Employee Resource Allocation** across multiple Service POs and Sub-Projects
- **Timesheet Logging** with daily hours logged per employee per PO
- **Monthly Cost Management** including salary costs, operational costs, and billable costs
- **Client and PO Management** covering project types such as Projects, Service Packs, Resource Outsourcing, and Managed Services
- **Bulk Timesheet Import** via Excel upload with validation and error reporting
- **Role-Based Access Control** with five distinct roles
- **Audit Logging** for all create/update/delete operations
- **Notifications** for important system events

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime environment |
| Express.js | 4.x | Web framework |
| PostgreSQL | 14+ | Relational database |
| Sequelize | 6.x | ORM for PostgreSQL |
| JWT (jsonwebtoken) | 9.x | Authentication tokens |
| bcrypt | 5.x | Password hashing |
| Multer | 1.x | File upload handling |
| SheetJS (xlsx) | 0.18+ | Excel read/write |
| Joi | 17.x | Request validation |
| Winston | 3.x | Logging framework |
| Swagger UI Express | 5.x | API documentation |
| node-cron | 3.x | Scheduled jobs |
| dotenv | 16.x | Environment variables |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18+ | UI framework |
| Vite | 5.x | Build tool |
| Material UI (MUI) | 5.x | Component library |
| React Router | 6.x | Client-side routing |
| Axios | 1.x | HTTP client |
| React Query | 5.x | Server state management |

---

## Prerequisites

Ensure the following are installed before proceeding:

- **Node.js** v18.0.0 or higher — [Download](https://nodejs.org/)
- **npm** v9.0.0 or higher (bundled with Node.js)
- **PostgreSQL** v14.0 or higher — [Download](https://www.postgresql.org/download/)
- **Git** — [Download](https://git-scm.com/)

Verify installations:

```bash
node --version    # v18.x.x or higher
npm --version     # 9.x.x or higher
psql --version    # psql (PostgreSQL) 14.x or higher
```

---

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "RUT Full Stack"
```

### 2. Backend Setup

```bash
cd backend
npm install
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

---

## Environment Setup

### Backend Environment

Copy the example environment file and configure it:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your configuration values (database credentials, JWT secret, etc.). See [backend/.env.example](./backend/.env.example) for all available variables and their descriptions.

### Frontend Environment

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env` with the backend API URL:

```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=RUT Portal
```

---

## Database Setup

### 1. Create the Database

Connect to PostgreSQL and create the database:

```bash
psql -U postgres
```

```sql
CREATE DATABASE rut_portal;
CREATE USER rut_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE rut_portal TO rut_user;
\q
```

### 2. Run Migrations

From the `backend` directory:

```bash
npx sequelize-cli db:migrate
```

### 3. Run Seeders (Initial Data)

```bash
npx sequelize-cli db:seed:all
```

This seeds:
- Default roles (HR, Finance, Division Head, Project Manager, Management)
- Default service types (Project, Service Pack, Resource Outsourcing, Managed Services)
- Default admin user

### 4. Manual Schema Creation (Alternative)

If not using migrations, run the SQL schema directly:

```bash
psql -U rut_user -d rut_portal -f backend/src/database/schema.sql
psql -U rut_user -d rut_portal -f backend/src/database/seed.sql
```

---

## Running the Application

### Development Mode

**Backend** (from `backend/` directory):

```bash
npm run dev
```

The backend server starts on `http://localhost:5000`

**Frontend** (from `frontend/` directory):

```bash
npm run dev
```

The frontend dev server starts on `http://localhost:5173`

### Production Mode

**Backend:**

```bash
cd backend
npm start
```

**Frontend Build:**

```bash
cd frontend
npm run build
```

The production build outputs to `frontend/dist/`. Serve using Nginx, Apache, or a static file server.

**Using PM2 for Production (Backend):**

```bash
npm install -g pm2
cd backend
pm2 start src/server.js --name rut-portal-api
pm2 save
pm2 startup
```

---

## API Documentation

Once the backend server is running, access the Swagger UI:

```
http://localhost:5000/api-docs
```

The Swagger documentation covers all endpoints with request/response schemas, authentication requirements, and example payloads.

---

## Default Credentials

After running seeders, use these credentials to log in:

| Role | Email | Password |
|---|---|---|
| Management | admin@rutportal.com | Admin@1234 |
| HR | hr@rutportal.com | Hr@1234 |
| Finance | finance@rutportal.com | Finance@1234 |
| Division Head | divhead@rutportal.com | DivHead@1234 |
| Project Manager | pm@rutportal.com | PM@1234 |

**Important:** Change all default passwords immediately after first login in production environments.

---

## Project Structure

```
RUT Full Stack/
├── README.md
├── .gitignore
│
├── backend/
│   ├── .env.example
│   ├── .env                        # (gitignored)
│   ├── package.json
│   ├── package-lock.json
│   └── src/
│       ├── server.js               # Entry point
│       ├── app.js                  # Express app setup
│       ├── config/
│       │   ├── database.js         # Sequelize connection
│       │   ├── logger.js           # Winston logger config
│       │   └── swagger.js          # Swagger/OpenAPI config
│       ├── models/
│       │   ├── index.js            # Sequelize init + associations
│       │   ├── Role.js
│       │   ├── Employee.js
│       │   ├── User.js
│       │   ├── Client.js
│       │   ├── ServiceType.js
│       │   ├── ServicePO.js
│       │   ├── ServicePOResource.js
│       │   ├── SubProject.js
│       │   ├── MonthlyCost.js
│       │   ├── Timesheet.js
│       │   ├── AuditLog.js
│       │   ├── UserSession.js
│       │   ├── TimesheetImportHistory.js
│       │   ├── TimesheetImportError.js
│       │   └── Notification.js
│       ├── routes/
│       │   ├── index.js            # Central router
│       │   ├── auth.routes.js
│       │   ├── employee.routes.js
│       │   ├── user.routes.js
│       │   ├── role.routes.js
│       │   ├── client.routes.js
│       │   ├── serviceType.routes.js
│       │   ├── servicePO.routes.js
│       │   ├── subProject.routes.js
│       │   ├── monthlyCost.routes.js
│       │   ├── timesheet.routes.js
│       │   ├── report.routes.js
│       │   ├── dashboard.routes.js
│       │   └── notification.routes.js
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── employee.controller.js
│       │   ├── user.controller.js
│       │   ├── role.controller.js
│       │   ├── client.controller.js
│       │   ├── serviceType.controller.js
│       │   ├── servicePO.controller.js
│       │   ├── subProject.controller.js
│       │   ├── monthlyCost.controller.js
│       │   ├── timesheet.controller.js
│       │   ├── report.controller.js
│       │   ├── dashboard.controller.js
│       │   └── notification.controller.js
│       ├── middleware/
│       │   ├── auth.middleware.js   # JWT verification
│       │   ├── role.middleware.js   # Role-based access
│       │   ├── audit.middleware.js  # Audit logging
│       │   ├── upload.middleware.js # Multer config
│       │   └── validate.middleware.js # Joi validation
│       ├── validators/
│       │   ├── auth.validator.js
│       │   ├── employee.validator.js
│       │   ├── user.validator.js
│       │   ├── client.validator.js
│       │   ├── servicePO.validator.js
│       │   ├── subProject.validator.js
│       │   ├── monthlyCost.validator.js
│       │   └── timesheet.validator.js
│       ├── utils/
│       │   ├── excelTemplate.js    # Timesheet Excel template generator
│       │   ├── excelParser.js      # Excel import parser
│       │   ├── response.js         # Standardized API response helpers
│       │   ├── pagination.js       # Pagination helpers
│       │   └── dateHelpers.js      # Date utility functions
│       ├── jobs/
│       │   └── cleanupSessions.js  # Scheduled session cleanup job
│       └── database/
│           ├── schema.sql          # Full database schema
│           └── seed.sql            # Initial seed data
│
├── frontend/
│   ├── .env.example
│   ├── .env                        # (gitignored)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx                # React entry point
│       ├── App.jsx                 # Root component + routing
│       ├── theme.js                # MUI theme config
│       ├── api/
│       │   ├── axios.js            # Axios instance + interceptors
│       │   ├── auth.api.js
│       │   ├── employee.api.js
│       │   ├── user.api.js
│       │   ├── client.api.js
│       │   ├── servicePO.api.js
│       │   ├── subProject.api.js
│       │   ├── timesheet.api.js
│       │   ├── monthlyCost.api.js
│       │   ├── report.api.js
│       │   └── dashboard.api.js
│       ├── components/
│       │   ├── layout/
│       │   │   ├── AppLayout.jsx
│       │   │   ├── Sidebar.jsx
│       │   │   ├── Topbar.jsx
│       │   │   └── ProtectedRoute.jsx
│       │   ├── common/
│       │   │   ├── DataTable.jsx
│       │   │   ├── ConfirmDialog.jsx
│       │   │   ├── LoadingSpinner.jsx
│       │   │   ├── StatusChip.jsx
│       │   │   └── PageHeader.jsx
│       │   └── forms/
│       │       ├── EmployeeForm.jsx
│       │       ├── ServicePOForm.jsx
│       │       └── TimesheetForm.jsx
│       ├── pages/
│       │   ├── auth/
│       │   │   └── Login.jsx
│       │   ├── dashboard/
│       │   │   └── Dashboard.jsx
│       │   ├── employees/
│       │   │   ├── EmployeeList.jsx
│       │   │   └── EmployeeForm.jsx
│       │   ├── clients/
│       │   │   └── ClientList.jsx
│       │   ├── servicePOs/
│       │   │   ├── ServicePOList.jsx
│       │   │   └── ServicePODetail.jsx
│       │   ├── subProjects/
│       │   │   └── SubProjectList.jsx
│       │   ├── timesheets/
│       │   │   ├── TimesheetList.jsx
│       │   │   └── TimesheetImport.jsx
│       │   ├── monthlyCosts/
│       │   │   └── MonthlyCostList.jsx
│       │   ├── reports/
│       │   │   └── Reports.jsx
│       │   ├── users/
│       │   │   └── UserList.jsx
│       │   └── NotFound.jsx
│       ├── store/
│       │   ├── authStore.js        # Auth state (Zustand or Context)
│       │   └── notificationStore.js
│       ├── hooks/
│       │   ├── useAuth.js
│       │   ├── usePermissions.js
│       │   └── usePagination.js
│       └── utils/
│           ├── constants.js
│           ├── formatters.js
│           └── validators.js
│
├── uploads/                        # (gitignored) Uploaded Excel files
└── logs/                           # (gitignored) Application logs
```

---

## Module Descriptions

### Authentication Module
Handles user login, logout, token refresh, and password change. Issues JWT access tokens (15-minute expiry) and refresh tokens (7-day expiry) stored in the `user_sessions` table. Tracks last login timestamp and IP address.

### Employee Module
Manages the employee master data including employee code, designation, experience (total and company), joining/leaving dates, and resource descriptions. Employees are linked to users and can be assigned to Service POs.

### User Module
Manages system user accounts linked to employees. Controls role assignment, account activation/deactivation, and password resets. Each user has exactly one role.

### Role Module
Read-only reference data for the five system roles. Roles drive the permission matrix across all modules.

### Client Module
Manages client master data with client code, name, and industry classification. Clients are linked to Service POs.

### Service Type Module
Reference data for PO types: Project, Service Pack, Resource Outsourcing, and Managed Services.

### Service PO Module
Core module for managing Service Purchase Orders. Tracks PO value, expected man-hours, billability, start/end dates, and associated resources (employees assigned to the PO).

### Sub-Project Module
Manages sub-projects under a Service PO. Timesheets can optionally be logged against a specific sub-project within a PO.

### Monthly Cost Module
Tracks per-employee monthly costs including salary cost, operational cost, total cost, operational cost per employee, and billable cost. Used for profitability and utilization reports.

### Timesheet Module
Core tracking module for daily hours logged by employees against Service POs and optional sub-projects. Supports single-entry creation and bulk Excel import with full validation and error reporting.

### Reports Module
Generates analytical reports:
- **Utilization Report**: Hours logged vs. expected man-hours per PO
- **Cost vs. Billing Report**: Comparison of monthly costs vs. billable hours
- **Employee Utilization**: Per-employee utilization across POs
- **Client-wise Summary**: Aggregated hours and costs by client

### Dashboard Module
Provides summary KPIs for the home screen:
- Total active employees, active POs, and clients
- Monthly hours logged
- Utilization percentage
- Recent timesheet activity

### Notification Module
In-app notifications for events such as timesheet import completions, PO approaching end dates, and admin actions. Supports mark-as-read and bulk-clear operations.

### Audit Log Module
Automatically records all create, update, and delete operations across entities with old/new values stored as JSONB. Accessible to Management role only.

### Session Cleanup Job
A scheduled job (runs daily at midnight) that deletes expired refresh tokens from the `user_sessions` table to prevent database bloat.

---

## Role Permissions Matrix

| Module | HR | Finance | Division Head | Project Manager | Management |
|---|:---:|:---:|:---:|:---:|:---:|
| **Dashboard** | View | View | View | View | View |
| **Employees - View** | Yes | No | Yes | Yes | Yes |
| **Employees - Create/Edit** | Yes | No | No | No | Yes |
| **Employees - Delete** | No | No | No | No | Yes |
| **Users - View** | Yes | No | No | No | Yes |
| **Users - Create/Edit** | Yes | No | No | No | Yes |
| **Users - Delete** | No | No | No | No | Yes |
| **Roles - View** | Yes | No | No | No | Yes |
| **Clients - View** | No | Yes | Yes | Yes | Yes |
| **Clients - Create/Edit** | No | Yes | No | No | Yes |
| **Clients - Delete** | No | No | No | No | Yes |
| **Service Types - View** | No | Yes | Yes | Yes | Yes |
| **Service Types - Create/Edit** | No | No | No | No | Yes |
| **Service POs - View** | No | Yes | Yes | Yes | Yes |
| **Service POs - Create/Edit** | No | Yes | No | Yes | Yes |
| **Service POs - Delete** | No | No | No | No | Yes |
| **Sub-Projects - View** | No | Yes | Yes | Yes | Yes |
| **Sub-Projects - Create/Edit** | No | No | No | Yes | Yes |
| **Sub-Projects - Delete** | No | No | No | No | Yes |
| **Monthly Costs - View** | No | Yes | No | No | Yes |
| **Monthly Costs - Create/Edit** | No | Yes | No | No | Yes |
| **Monthly Costs - Delete** | No | No | No | No | Yes |
| **Timesheets - View Own** | No | No | Yes | Yes | Yes |
| **Timesheets - View All** | No | No | Yes | Yes | Yes |
| **Timesheets - Create** | No | No | Yes | Yes | Yes |
| **Timesheets - Import (Excel)** | No | No | Yes | Yes | Yes |
| **Timesheets - Delete** | No | No | No | No | Yes |
| **Reports - Utilization** | No | Yes | Yes | Yes | Yes |
| **Reports - Cost vs Billing** | No | Yes | No | No | Yes |
| **Reports - Employee Util.** | No | Yes | Yes | Yes | Yes |
| **Reports - Client Summary** | No | Yes | Yes | No | Yes |
| **Audit Logs - View** | No | No | No | No | Yes |
| **Notifications** | Yes | Yes | Yes | Yes | Yes |

---

## Timesheet Import Template

The Excel import template can be downloaded from the application at:

```
GET /api/timesheets/template/download
```

### Template Format

The Excel file must contain the following columns in **Sheet 1**, starting from **Row 1** (header row):

| Column | Header Text | Type | Required | Example | Notes |
|---|---|---|---|---|---|
| A | Resource Name | Text | Yes | John Smith | Must match full_name in employees table |
| B | Service PO Name | Text | Yes | RUT-PO-2024-001 | Must match service_po_name or service_po_code |
| C | Sub Project | Text | No | Module A Development | Leave blank if not applicable |
| D | Date | Date | Yes | 2024-01-15 | Format: YYYY-MM-DD or DD/MM/YYYY |
| E | Hours | Number | Yes | 8.00 | Decimal, max 24.00, min 0.25 |

### Import Rules

1. The file must be `.xlsx` or `.xls` format.
2. Maximum file size: **5 MB**.
3. Maximum rows per import: **1000 rows** (excluding header).
4. Duplicate entries (same employee + PO + date) will be flagged as errors.
5. Hours per day per employee cannot exceed **24 hours** in total across all POs.
6. Employee names and PO names are matched **case-insensitively**.
7. After import, a summary report is available showing valid rows imported and error rows with reasons.

### Sample Data Row

```
| John Smith | ERP Implementation 2024 | Backend Development | 2024-01-15 | 8.00 |
```

### Download Template

After login, navigate to **Timesheets > Import** and click **Download Template** to get the pre-formatted Excel file.

---

## Logs

Application logs are stored in the `logs/` directory (gitignored):

- `logs/combined.log` — All log levels
- `logs/error.log` — Error-level logs only

Log rotation is configured to keep files up to 20 MB with a maximum of 14 days retention.

---

## Contributing

1. Create a feature branch from `main`: `git checkout -b feature/your-feature`
2. Commit changes following conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
3. Open a pull request with a clear description of changes

---

## License

This project is proprietary software. All rights reserved.
