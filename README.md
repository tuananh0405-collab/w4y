# W4Y Job Management API

This document describes all the job-related API endpoints implemented in the W4Y application.

## Base URL
```
http://localhost:3000/api/v1/jobs
```

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in cookies or Authorization header.

## Role-Based Access Control
- **Recruiter (Nhà Tuyển Dụng)**: Can create, update, delete, and manage their own job posts
- **Applicant (Ứng Viên)**: Can view jobs, apply, and get recommendations
- **Admin**: Can manage all jobs and view analytics
- **All**: Can view public job listings

---

## 📋 Basic CRUD Operations

### 1. Create Job Post
**POST** `/api/v1/jobs`

**Purpose**: Create a new job post

**Allowed Roles**: Recruiter (Nhà Tuyển Dụng)

**Request Body**:
```json
{
  "title": "Senior Frontend Developer",
  "description": "We are looking for an experienced frontend developer...",
  "requirements": "React, TypeScript, 3+ years experience",
  "salary": "2000-3000 USD",
  "deliveryTime": "Full-time",
  "priorityLevel": "Nổi bật",
  "quantity": 2,
  "level": "Senior",
  "industry": "Technology",
  "position": "Frontend Developer",
  "location": "Ho Chi Minh City",
  "experience": "3-5 years",
  "deadline": "2024-12-31",
  "keywords": ["react", "typescript", "frontend"],
  "skills": ["React", "TypeScript", "JavaScript", "HTML", "CSS"]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Job posted successfully",
  "data": {
    "id": "job_id",
    "employerName": "Company Name",
    "title": "Senior Frontend Developer",
    "description": "...",
    "requirements": "...",
    "salary": "2000-3000 USD",
    "deliveryTime": "Full-time",
    "priorityLevel": "Nổi bật",
    "quantity": 2,
    "level": "Senior",
    "industry": "Technology",
    "position": "Frontend Developer",
    "location": "Ho Chi Minh City",
    "experience": "3-5 years",
    "deadline": "2024-12-31T00:00:00.000Z",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Get Job List
**GET** `/api/v1/jobs`

**Purpose**: Get a list of job posts with filtering

**Allowed Roles**: All

**Query Parameters**:
- `location` (string): Filter by location
- `position` (string): Filter by position
- `keywords` (string): Search by keywords
- `skills` (string): Filter by skills (comma-separated)
- `industry` (string): Filter by industry
- `level` (string): Filter by level
- `status` (string): Filter by status (default: "active")
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)

**Example**: `GET /api/v1/jobs?location=Ho Chi Minh City&skills=React,TypeScript&page=1&limit=10`

**Response**:
```json
{
  "success": true,
  "message": "Job list fetched successfully",
  "data": [
    {
      "id": "job_id",
      "employerName": "Company Name",
      "title": "Senior Frontend Developer",
      "description": "...",
      "requirements": "...",
      "salary": "2000-3000 USD",
      "deliveryTime": "Full-time",
      "priorityLevel": "Nổi bật",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "location": "Ho Chi Minh City",
      "experience": "3-5 years",
      "industry": "Technology",
      "position": "Frontend Developer",
      "level": "Senior",
      "views": 150,
      "status": "active"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalJobs": 50,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### 3. Get Job Detail
**GET** `/api/v1/jobs/:id`

**Purpose**: Get detailed information about a specific job

**Allowed Roles**: All

**Response**:
```json
{
  "success": true,
  "message": "Job detail fetched successfully",
  "data": {
    "id": "job_id",
    "employerName": "Company Name",
    "employerId": "employer_id",
    "title": "Senior Frontend Developer",
    "description": "...",
    "requirements": "...",
    "experience": "3-5 years",
    "salary": "2000-3000 USD",
    "deliveryTime": "Full-time",
    "priorityLevel": "Nổi bật",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "deadline": "2024-12-31T00:00:00.000Z",
    "quantity": 2,
    "level": "Senior",
    "industry": "Technology",
    "position": "Frontend Developer",
    "location": "Ho Chi Minh City",
    "keywords": ["react", "typescript", "frontend"],
    "skills": ["React", "TypeScript", "JavaScript", "HTML", "CSS"],
    "views": 151,
    "status": "active"
  }
}
```

### 4. Update Job
**PUT** `/api/v1/jobs/:id`

**Purpose**: Update an existing job post

**Allowed Roles**: Recruiter (owner of the job)

**Request Body**: Same as create job (all fields optional)

**Response**:
```json
{
  "success": true,
  "message": "Job updated successfully",
  "data": {
    // Updated job object
  }
}
```

### 5. Delete Job
**DELETE** `/api/v1/jobs/:id`

**Purpose**: Delete a job post (permanent delete)

**Allowed Roles**: Recruiter (owner of the job)

**Response**:
```json
{
  "success": true,
  "message": "Job deleted successfully"
}
```

---

## 🔧 Job Management

### 6. Hide/Unhide Job
**PUT** `/api/v1/jobs/:id/hide`

**Purpose**: Temporarily hide a job from public view

**Allowed Roles**: Recruiter (owner of the job)

**Response**:
```json
{
  "success": true,
  "message": "Job hidden successfully",
  "data": {
    "id": "job_id",
    "isHidden": true
  }
}
```

### 7. Update Job Status
**PATCH** `/api/v1/jobs/:id/status`

**Purpose**: Change the status of a job

**Allowed Roles**: Admin

**Request Body**:
```json
{
  "status": "approved" // active, inactive, pending, approved, rejected, flagged
}
```

**Response**:
```json
{
  "success": true,
  "message": "Job status updated successfully",
  "data": {
    "id": "job_id",
    "status": "approved"
  }
}
```

### 8. Track Job View
**POST** `/api/v1/jobs/:id/view`

**Purpose**: Track the number of views for a job post

**Allowed Roles**: All

**Response**:
```json
{
  "success": true,
  "message": "Job view tracked successfully",
  "data": {
    "id": "job_id",
    "views": 152
  }
}
```

---

## 📊 Analytics and Overview

### 9. Get Job Overview
**GET** `/api/v1/jobs/overview`

**Purpose**: Get an overview of job posts

**Allowed Roles**: Admin

**Query Parameters**:
- `startDate` (string): Start date for filtering
- `endDate` (string): End date for filtering

**Response**:
```json
{
  "success": true,
  "message": "Job overview fetched successfully",
  "data": {
    "statistics": {
      "totalJobs": 100,
      "activeJobs": 80,
      "pendingJobs": 15,
      "hiddenJobs": 5
    },
    "jobsByIndustry": [
      { "_id": "Technology", "count": 45 },
      { "_id": "Finance", "count": 25 }
    ],
    "jobsByStatus": [
      { "_id": "active", "count": 80 },
      { "_id": "pending", "count": 15 }
    ],
    "recentJobs": [
      {
        "id": "job_id",
        "title": "Senior Frontend Developer",
        "employerName": "Company Name",
        "status": "active",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### 10. Get Filter Options
**GET** `/api/v1/jobs/filter-options`

**Purpose**: Get filter options for job search

**Allowed Roles**: All

**Response**:
```json
{
  "success": true,
  "message": "Filter options fetched successfully",
  "data": {
    "locations": ["Ho Chi Minh City", "Hanoi", "Da Nang"],
    "positions": ["Frontend Developer", "Backend Developer", "Full Stack Developer"],
    "industries": ["Technology", "Finance", "Healthcare"],
    "levels": ["Junior", "Mid-level", "Senior", "Lead"]
  }
}
```

---

## 👥 Recruiter Specific

### 11. Get Jobs by Recruiter
**GET** `/api/v1/jobs/recruiter/:recruiterId`

**Purpose**: Get all jobs posted by a specific recruiter

**Allowed Roles**: Admin, Recruiter (if viewing own jobs)

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)

**Response**:
```json
{
  "success": true,
  "message": "Jobs fetched successfully",
  "data": {
    "recruiter": {
      "id": "recruiter_id",
      "name": "Recruiter Name",
      "email": "recruiter@company.com"
    },
    "jobs": [
      {
        "id": "job_id",
        "title": "Senior Frontend Developer",
        "status": "active",
        "isHidden": false,
        "views": 150,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "deadline": "2024-12-31T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalJobs": 25,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

## 📝 Application Management

### 12. Get Job Applicants
**GET** `/api/v1/jobs/:jobId/applicants`

**Purpose**: View the list of applicants who applied for a specific job

**Allowed Roles**: Recruiter (owner of the job)

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)

**Response**:
```json
{
  "success": true,
  "message": "Job applicants fetched successfully",
  "data": {
    "job": {
      "id": "job_id",
      "title": "Senior Frontend Developer"
    },
    "applicants": [
      {
        "id": "application_id",
        "applicantId": "applicant_id",
        "applicantName": "Applicant Name",
        "applicantEmail": "applicant@email.com",
        "applicantPhone": "0123456789",
        "status": "Pending",
        "appliedAt": "2024-01-01T00:00:00.000Z",
        "resumeFile": {
          "path": "/uploads/cv/applicant_cv.pdf",
          "contentType": "application/pdf"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalApplications": 15,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### 13. Update Application Status
**PATCH** `/api/v1/jobs/:jobId/applications/:applicantId`

**Purpose**: Update the application status of an applicant

**Allowed Roles**: Recruiter (owner of the job)

**Request Body**:
```json
{
  "status": "Phỏng vấn" // Pending, Phỏng vấn, Từ chối, Mới nhận
}
```

**Response**:
```json
{
  "success": true,
  "message": "Application status updated successfully",
  "data": {
    "id": "application_id",
    "applicantName": "Applicant Name",
    "applicantEmail": "applicant@email.com",
    "status": "Phỏng vấn",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 🎯 Special Features

### 14. Get Recommended Jobs
**GET** `/api/v1/jobs/recommended`

**Purpose**: Get AI-recommended jobs for the logged-in applicant

**Allowed Roles**: Applicant

**Response**:
```json
{
  "success": true,
  "message": "Recommended jobs fetched successfully",
  "data": [
    {
      "id": "job_id",
      "employerName": "Company Name",
      "title": "Senior Frontend Developer",
      "description": "...",
      "salary": "2000-3000 USD",
      "location": "Ho Chi Minh City",
      "experience": "3-5 years",
      "industry": "Technology",
      "position": "Frontend Developer",
      "level": "Senior",
      "priorityLevel": "Nổi bật",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "deadline": "2024-12-31T00:00:00.000Z"
    }
  ]
}
```

### 15. Get Expired Jobs
**GET** `/api/v1/jobs/expired`

**Purpose**: View expired job posts

**Allowed Roles**: Recruiter, Admin

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)

**Response**:
```json
{
  "success": true,
  "message": "Expired jobs fetched successfully",
  "data": {
    "jobs": [
      {
        "id": "job_id",
        "title": "Senior Frontend Developer",
        "employerName": "Company Name",
        "deadline": "2024-01-01T00:00:00.000Z",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "views": 150
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalExpiredJobs": 15,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### 16. Get Related Jobs
**GET** `/api/v1/jobs/related/:jobId`

**Purpose**: Fetch similar or related jobs based on a specific job

**Allowed Roles**: All

**Query Parameters**:
- `limit` (number): Number of related jobs to return (default: 5)

**Response**:
```json
{
  "success": true,
  "message": "Related jobs fetched successfully",
  "data": {
    "referenceJob": {
      "id": "job_id",
      "title": "Senior Frontend Developer",
      "industry": "Technology",
      "position": "Frontend Developer",
      "location": "Ho Chi Minh City"
    },
    "relatedJobs": [
      {
        "id": "related_job_id",
        "employerName": "Another Company",
        "title": "Frontend Developer",
        "description": "...",
        "salary": "1500-2500 USD",
        "location": "Ho Chi Minh City",
        "experience": "2-4 years",
        "industry": "Technology",
        "position": "Frontend Developer",
        "level": "Mid-level",
        "priorityLevel": "Thông thường",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "deadline": "2024-12-31T00:00:00.000Z"
      }
    ]
  }
}
```

---

## 🔐 Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

---

## 📝 Notes

1. **Authentication**: Most endpoints require a valid JWT token in cookies or Authorization header
2. **Pagination**: List endpoints support pagination with `page` and `limit` parameters
3. **Filtering**: Job list supports multiple filter options
4. **Authorization**: Role-based access control is enforced for all endpoints
5. **File Uploads**: CV uploads are handled separately in the application routes
6. **Real-time Updates**: Job views are tracked automatically when viewing job details

---

## 🚀 Getting Started

1. Ensure the server is running on `http://localhost:3000`
2. Authenticate using the auth endpoints to get a JWT token
3. Use the token in subsequent requests
4. Follow the role-based access control guidelines

For more information about authentication and other endpoints, refer to the main API documentation.