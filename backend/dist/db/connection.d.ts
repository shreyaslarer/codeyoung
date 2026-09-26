import mongoose from 'mongoose';
export declare function connectToDatabase(): Promise<void>;
export declare function disconnectFromDatabase(): Promise<void>;
export declare const connectDatabase: typeof connectToDatabase;
export declare const disconnectDatabase: typeof disconnectFromDatabase;
export { mongoose };
