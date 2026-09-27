import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { connectToDatabase, disconnectFromDatabase } from './db/connection.js';
import mentorRoutes from './routes/mentor.routes.js';
import schedulingRoutes from './routes/scheduling.routes.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;
// CORS configuration for local development and production
const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    credentials: true,
    maxAge: 86400, // 24 hours
};
// Middleware
app.use(cors(corsOptions));
app.use(express.json());
// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// API routes
app.use('/api/mentors', mentorRoutes);
app.use('/api', schedulingRoutes);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        type: 'https://codeyoung.dev/problems/not-found',
        title: 'Not Found',
        status: 404,
        detail: 'The requested resource does not exist.',
    });
});
// Start server
async function startServer() {
    try {
        await connectToDatabase();
        const server = app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
            console.log(`Mentors API: http://localhost:${PORT}/api/mentors`);
            console.log(`Availability API: http://localhost:${PORT}/api/availability`);
            console.log(`Bookings API: http://localhost:${PORT}/api/bookings`);
        });
        server.on('error', async (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`\n[Server Error] Port ${PORT} is already in use by another process.`);
                console.error(`To resolve this, please stop the existing process on port ${PORT} or configure a different PORT in .env.`);
            }
            else {
                console.error('[Server Error]:', error);
            }
            await disconnectFromDatabase().catch(() => { });
            process.exit(1);
        });
        const shutdown = async (signal) => {
            console.log(`\nReceived ${signal}. Shutting down gracefully...`);
            server.close(async () => {
                await disconnectFromDatabase().catch(() => { });
                process.exit(0);
            });
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
