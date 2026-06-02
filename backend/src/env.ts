import dotenv from 'dotenv';
import path from 'path';

// Try loading from root first
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Also load from local backend/.env as fallback
dotenv.config();
