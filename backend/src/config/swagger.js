const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Gunny Bags Manager REST API',
    version: '1.0.0',
    description: `Complete REST API documentation for the **Gunny Bags Manager SaaS Platform**.
    
Used by both the **Next.js Web Dashboard** and the **Flutter Mobile App**.

### Authentication:
Protected endpoints require a JWT Bearer token passed in the \`Authorization\` header:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`
Click **Authorize** at the top right to set your token once for all test requests.

### Development Testing Credentials:
* **Master OTP for Mobile Testing**: \`123456\` (Works on any 10-digit mobile number)
* **Master SaaS Admin Login**: \`admin@admin.com\` / Password: \`123456\`
`,
    contact: {
      name: 'Gunny Bags Tech Support',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Current Environment API Base (/api/v1)',
    },
    {
      url: 'http://localhost:5050/api/v1',
      description: 'Localhost Web & iOS Simulator',
    },
    {
      url: 'http://10.0.2.2:5050/api/v1',
      description: 'Android Emulator',
    },
  ],
  tags: [
    { name: 'Authentication', description: 'Mobile OTP login, registration, token refresh, and profile management' },
    { name: 'Dashboard', description: 'KPI summaries, bag counts, today payable, and recent activity' },
    { name: 'Employees', description: 'Worker directory, rate per bag settings, wage ledgers' },
    { name: 'Work Entries', description: 'Daily bag production logging and wage tracking' },
    { name: 'Payouts', description: 'Worker wage payouts (Cash, UPI, Bank Transfer)' },
    { name: 'Master Admin', description: 'Super Admin tenant and platform management' },
    { name: 'System', description: 'Health check and server uptime' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token obtained from /auth/verify-otp or /auth/admin-login',
      },
    },
    schemas: {
      StandardResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Invalid credentials or resource not found' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              details: { type: 'string', nullable: true, example: null },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'usr_89f1a2' },
          name: { type: 'string', example: 'Om Patel' },
          mobile: { type: 'string', example: '9876543210' },
          businessName: { type: 'string', example: 'Patel Gunny Bags Traders' },
          role: { type: 'string', enum: ['OWNER', 'MANAGER', 'SUPER_ADMIN'], example: 'OWNER' },
          isActive: { type: 'boolean', example: true },
        },
      },
      Employee: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'emp_01' },
          name: { type: 'string', example: 'Ramesh Kumar' },
          mobile: { type: 'string', example: '9876543210' },
          ratePerBag: { type: 'number', format: 'float', example: 5.0 },
          isActive: { type: 'boolean', example: true },
          address: { type: 'string', example: 'Shop 4, Market Yard' },
          notes: { type: 'string', example: 'Specialist stitcher' },
          totalBags: { type: 'integer', example: 1420 },
          totalEarned: { type: 'number', format: 'float', example: 7100.0 },
          totalPaid: { type: 'number', format: 'float', example: 5000.0 },
          pendingAmount: { type: 'number', format: 'float', example: 2100.0 },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      WorkEntry: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'we_01' },
          employeeId: { type: 'string', example: 'emp_01' },
          employeeName: { type: 'string', example: 'Ramesh Kumar' },
          date: { type: 'string', format: 'date', example: '2026-10-08' },
          bagCount: { type: 'integer', example: 150 },
          ratePerBag: { type: 'number', format: 'float', example: 5.0 },
          additionalCharges: { type: 'number', format: 'float', example: 50.0 },
          totalAmount: { type: 'number', format: 'float', example: 800.0 },
          time: { type: 'string', example: '14:30' },
          notes: { type: 'string', example: 'Lot 2 batch' },
        },
      },
      Payout: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'po_01' },
          employeeId: { type: 'string', example: 'emp_01' },
          employeeName: { type: 'string', example: 'Ramesh Kumar' },
          date: { type: 'string', format: 'date', example: '2026-10-08' },
          payoutAmount: { type: 'number', format: 'float', example: 3000.0 },
          pendingBeforePayout: { type: 'number', format: 'float', example: 5100.0 },
          remainingAmount: { type: 'number', format: 'float', example: 2100.0 },
          paymentMode: { type: 'string', enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'], example: 'CASH' },
          referenceNote: { type: 'string', example: 'Weekly wage settlement' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    // ─── AUTHENTICATION ───────────────────────────────────────────────────────────
    '/auth/send-otp': {
      post: {
        tags: ['Authentication'],
        summary: 'Send login OTP to mobile number',
        description: 'Initiates mobile OTP authentication. Generates a session ID and sends a 6-digit OTP via SMS (or accepts master OTP 123456 in dev).',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['mobile'],
                properties: {
                  mobile: { type: 'string', example: '9876543210', description: '10-digit mobile number' },
                  countryCode: { type: 'string', default: '+91', example: '+91' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'OTP sent successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'OTP sent successfully to +91 9876543210' },
                    data: {
                      type: 'object',
                      properties: {
                        sessionId: { type: 'string', example: 'sess_98fb45e4473a' },
                        expiresInSeconds: { type: 'integer', example: 300 },
                        resendCooldownSeconds: { type: 'integer', example: 60 },
                        isNewUser: { type: 'boolean', example: false },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid mobile number format' },
          429: { description: 'Rate limit exceeded (too many OTP requests)' },
        },
      },
    },

    '/auth/verify-otp': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify OTP and obtain JWT Bearer Token',
        description: 'Validates the 6-digit OTP against the session ID. Returns JWT access token and user tenant profile.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['mobile', 'otp', 'sessionId'],
                properties: {
                  mobile: { type: 'string', example: '9876543210' },
                  otp: { type: 'string', example: '123456' },
                  sessionId: { type: 'string', example: 'sess_98fb45e4473a' },
                  countryCode: { type: 'string', default: '+91', example: '+91' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'OTP verified & logged in',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Login successful' },
                    data: {
                      type: 'object',
                      properties: {
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                        user: { $ref: '#/components/schemas/User' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Missing required parameters' },
          401: { description: 'Invalid or expired OTP' },
        },
      },
    },

    '/auth/resend-otp': {
      post: {
        tags: ['Authentication'],
        summary: 'Resend OTP to existing session',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['mobile', 'sessionId'],
                properties: {
                  mobile: { type: 'string', example: '9876543210' },
                  sessionId: { type: 'string', example: 'sess_98fb45e4473a' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'OTP resent successfully' },
          429: { description: 'Resend cooldown active' },
        },
      },
    },

    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new business / factory tenant',
        description: 'Creates a new independent business tenant account on the platform.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'mobile', 'businessName'],
                properties: {
                  name: { type: 'string', example: 'Om Patel' },
                  mobile: { type: 'string', example: '9988776655' },
                  businessName: { type: 'string', example: 'Patel Gunny Bags Traders' },
                  countryCode: { type: 'string', default: '+91', example: '+91' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Account registered and OTP sent' },
          409: { description: 'Mobile number already registered' },
        },
      },
    },

    '/auth/refresh-token': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh expired access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'New JWT token generated' },
          401: { description: 'Invalid or expired refresh token' },
        },
      },
    },

    '/auth/admin-login': {
      post: {
        tags: ['Authentication'],
        summary: 'Master SaaS Admin Login (email & password)',
        description: 'Authenticates platform Super Admins (Default: admin@admin.com / 123456)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'admin@admin.com' },
                  password: { type: 'string', example: '123456' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Super admin authenticated' },
          401: { description: 'Invalid admin credentials' },
        },
      },
    },

    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current authenticated user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'User profile retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
    },

    '/auth/profile': {
      put: {
        tags: ['Authentication'],
        summary: 'Update current business profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Om Patel' },
                  businessName: { type: 'string', example: 'Patel Gunny Bags Traders Pvt Ltd' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Profile updated successfully' },
        },
      },
    },

    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Logout and revoke active session',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Logged out successfully' },
        },
      },
    },

    // ─── DASHBOARD ────────────────────────────────────────────────────────────────
    '/dashboard/summary': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get factory overview KPI metrics',
        description: 'Returns real-time totals for workers, today bags, payable wages, and net pending balance.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Dashboard metrics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        totalWorkers: { type: 'integer', example: 18 },
                        activeToday: { type: 'integer', example: 12 },
                        totalBagsToday: { type: 'integer', example: 1850 },
                        todayPayable: { type: 'number', format: 'float', example: 9250.0 },
                        pendingWages: { type: 'number', format: 'float', example: 34800.0 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/dashboard/recent-activity': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get recent work entries and payouts feed',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Recent activity feed retrieved',
          },
        },
      },
    },

    '/dashboard/charts': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get daily and weekly chart trend data',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Chart data retrieved' },
        },
      },
    },

    // ─── EMPLOYEES ────────────────────────────────────────────────────────────────
    '/employees': {
      get: {
        tags: ['Employees'],
        summary: 'List workers belonging to this business',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'isActive', in: 'query', schema: { type: 'boolean' }, description: 'Filter by active status' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by worker name or mobile' },
        ],
        responses: {
          200: {
            description: 'Workers list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Employee' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Employees'],
        summary: 'Add a new worker under this business',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', example: 'Ramesh Kumar' },
                  mobile: { type: 'string', example: '9876543210' },
                  ratePerBag: { type: 'number', default: 5.0, example: 5.0 },
                  isActive: { type: 'boolean', default: true, example: true },
                  address: { type: 'string', example: 'Plot 12, Market Yard' },
                  notes: { type: 'string', example: 'Skilled stitcher' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Worker created successfully' },
        },
      },
    },

    '/employees/{id}': {
      get: {
        tags: ['Employees'],
        summary: 'Get worker profile and summary stats',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Worker profile retrieved' },
          404: { description: 'Worker not found' },
        },
      },
      put: {
        tags: ['Employees'],
        summary: 'Update worker details or rate per bag',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Ramesh Kumar' },
                  mobile: { type: 'string', example: '9876543210' },
                  ratePerBag: { type: 'number', example: 5.5 },
                  isActive: { type: 'boolean', example: true },
                  address: { type: 'string', example: 'Shop 4' },
                  notes: { type: 'string', example: 'Updated notes' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Worker updated successfully' },
        },
      },
      delete: {
        tags: ['Employees'],
        summary: 'Deactivate worker (soft delete)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Worker deactivated successfully' },
        },
      },
    },

    // ─── WORK ENTRIES ─────────────────────────────────────────────────────────────
    '/work-entries': {
      get: {
        tags: ['Work Entries'],
        summary: 'List daily bag work entries',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Filter by exact date (YYYY-MM-DD)' },
          { name: 'employeeId', in: 'query', schema: { type: 'string' }, description: 'Filter by worker' },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: {
            description: 'Work entries list with pagination',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/WorkEntry' },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        currentPage: { type: 'integer', example: 1 },
                        totalPages: { type: 'integer', example: 5 },
                        totalCount: { type: 'integer', example: 95 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Work Entries'],
        summary: 'Log daily bag production for a worker',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['employeeId', 'date', 'bagCount'],
                properties: {
                  employeeId: { type: 'string', example: 'emp_01' },
                  date: { type: 'string', format: 'date', example: '2026-10-08' },
                  bagCount: { type: 'integer', minimum: 1, example: 150 },
                  ratePerBag: { type: 'number', example: 5.0, description: 'Optional: defaults to worker piece rate' },
                  additionalCharges: { type: 'number', default: 0.0, example: 50.0, description: 'Optional: extra charges in ₹ (defaults to 0.00)' },
                  time: { type: 'string', example: '14:30', description: 'Optional time' },
                  notes: { type: 'string', example: 'Lot 2 batch' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Work entry logged successfully' },
        },
      },
    },

    '/work-entries/{id}': {
      get: {
        tags: ['Work Entries'],
        summary: 'Get single work entry by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Work entry details' },
        },
      },
      put: {
        tags: ['Work Entries'],
        summary: 'Update work entry (bag count, rate, additional charges, date)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  bagCount: { type: 'integer', example: 160 },
                  ratePerBag: { type: 'number', example: 5.0 },
                  additionalCharges: { type: 'number', example: 50.0 },
                  date: { type: 'string', format: 'date', example: '2026-10-08' },
                  notes: { type: 'string', example: 'Adjusted count' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Work entry updated successfully' },
        },
      },
      delete: {
        tags: ['Work Entries'],
        summary: 'Delete work entry',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Work entry deleted successfully' },
        },
      },
    },

    // ─── PAYOUTS ──────────────────────────────────────────────────────────────────
    '/payouts': {
      get: {
        tags: ['Payouts'],
        summary: 'List wage payouts history',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'employeeId', in: 'query', schema: { type: 'string' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: {
            description: 'Payouts list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Payout' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Payouts'],
        summary: 'Record worker wage payout settlement',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['employeeId', 'date', 'payoutAmount'],
                properties: {
                  employeeId: { type: 'string', example: 'emp_01' },
                  date: { type: 'string', format: 'date', example: '2026-10-08' },
                  payoutAmount: { type: 'number', minimum: 1, example: 3000.0 },
                  paymentMode: { type: 'string', enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'], default: 'CASH', example: 'CASH' },
                  referenceNote: { type: 'string', example: 'Weekly wage settlement' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Payout recorded successfully' },
        },
      },
    },

    '/payouts/{id}': {
      delete: {
        tags: ['Payouts'],
        summary: 'Revert payout and restore worker pending wage balance',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Payout deleted and balance restored' },
        },
      },
    },

    // ─── MASTER ADMIN ─────────────────────────────────────────────────────────────
    '/admin/stats': {
      get: {
        tags: ['Master Admin'],
        summary: 'Platform-wide multi-tenant statistics',
        description: 'Requires Super Admin privileges (admin@admin.com)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Platform stats retrieved' },
        },
      },
    },

    '/admin/users': {
      get: {
        tags: ['Master Admin'],
        summary: 'List all business tenants across the platform',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of all tenants' },
        },
      },
      post: {
        tags: ['Master Admin'],
        summary: 'Create new tenant directly from Master Admin panel',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'mobile', 'businessName'],
                properties: {
                  name: { type: 'string', example: 'Varun Patel' },
                  mobile: { type: 'string', example: '9123456780' },
                  businessName: { type: 'string', example: 'Agravat Bags' },
                  role: { type: 'string', enum: ['OWNER', 'MANAGER'], default: 'OWNER' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Tenant created successfully' },
        },
      },
    },

    '/admin/users/{userId}': {
      get: {
        tags: ['Master Admin'],
        summary: 'Get comprehensive details, workers, entries & payouts for a tenant',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Tenant full data retrieved' },
        },
      },
      put: {
        tags: ['Master Admin'],
        summary: 'Update tenant business details or password',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  businessName: { type: 'string' },
                  mobile: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Tenant updated successfully' },
        },
      },
      delete: {
        tags: ['Master Admin'],
        summary: 'Delete tenant and cascade all business records',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Tenant deleted successfully' },
        },
      },
    },

    '/admin/users/{userId}/status': {
      patch: {
        tags: ['Master Admin'],
        summary: 'Suspend or activate a business tenant account',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['isActive'],
                properties: {
                  isActive: { type: 'boolean', example: false },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Tenant status toggled' },
        },
      },
    },

    // ─── SYSTEM ───────────────────────────────────────────────────────────────────
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check and API uptime status',
        responses: {
          200: {
            description: 'API is healthy and online',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Gunny Bags Manager API is running' },
                    version: { type: 'string', example: '1.0.0' },
                    timestamp: { type: 'string', format: 'date-time' },
                    uptime: { type: 'number', example: 124.5 },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

const swaggerUiOptions = {
  customSiteTitle: 'Gunny Bags Manager API Docs',
  customCss: `
    .swagger-ui .topbar { background-color: #0d1117; border-bottom: 1px solid #30363d; }
    .swagger-ui .topbar .topbar-wrapper .link { display: flex; align-items: center; font-weight: 700; color: #58a6ff; }
    .swagger-ui .btn.authorize { background: #238636; color: #fff; border-color: #2ea043; border-radius: 6px; }
    .swagger-ui .btn.authorize svg { fill: #fff; }
  `,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
  },
};

module.exports = {
  swaggerUi,
  swaggerDocument,
  swaggerUiOptions,
};
