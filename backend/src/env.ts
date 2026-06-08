import dotenv from 'dotenv';
import path from 'path';

// Try loading from root first
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Also load from local backend/.env as fallback
dotenv.config();

// Default the server timezone to Philippine Standard Time unless explicitly overridden.
// Set before any date/time code runs so all new Date() formatting uses PHT.
process.env.TZ = process.env.TZ || 'Asia/Manila';
