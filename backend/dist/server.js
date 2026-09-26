import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { connectToDatabase } from './db/connection.js';
import mentorRoutes from './routes/mentor.routes.js';
import schedulingRoutes from './routes/scheduling.routes.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;
// Middleware
app.use(cors());
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
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
            console.log(`Mentors API: http://localhost:${PORT}/api/mentors`);
            console.log(`Availability API: http://localhost:${PORT}/api/availability`);
            console.log(`Bookings API: http://localhost:${PORT}/api/bookings`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
