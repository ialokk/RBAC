import swaggerJSDoc from 'swagger-jsdoc';

// Foundation only — module-level route JSDoc annotations are added as each phase introduces real endpoints.
export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Food Delivery Platform API',
      version: '0.1.0',
      description: 'Version 1 modular monolith API (Node.js + Express + MongoDB).',
    },
    servers: [{ url: '/api/v1' }],
  },
  apis: ['src/modules/**/*.router.ts'],
});
