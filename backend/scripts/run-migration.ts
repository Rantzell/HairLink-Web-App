import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('Reading migration SQL file...');
  const sqlPath = path.join(__dirname, '../database/supabase_migration.sql');
  const content = fs.readFileSync(sqlPath, 'utf8');

  // Split by the large comment blocks
  const steps = content.split(/-- =+[\r\n]+/);

  console.log(`Found ${steps.length} potential blocks to execute.`);

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i].trim();
    if (!step || step.startsWith('--')) continue;

    console.log(`Executing block ${i}...`);
    try {
      // We still might have multiple statements in a block. 
      // PostgreSQL allows multiple statements in one query if they are separated by ; 
      // and not used in a prepared statement context. 
      // Prisma's $executeRawUnsafe might be using a prepared statement.
      
      // Let's try to further split by ; while respecting $$
      const statements = splitSql(step);
      for (const statement of statements) {
        if (!statement.trim()) continue;
        await prisma.$executeRawUnsafe(statement);
      }
      console.log(`Block ${i} executed.`);
    } catch (error: any) {
      console.error(`Error in block ${i}:`, error.message);
    }
  }

  await prisma.$disconnect();
}

function splitSql(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarString = false;
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i+1];
    
    if (char === '$' && nextChar === '$') {
      inDollarString = !inDollarString;
      current += '$$';
      i++;
      continue;
    }
    
    if (char === ';' && !inDollarString) {
      statements.push(current + ';');
      current = '';
      continue;
    }
    
    current += char;
  }
  
  if (current.trim()) statements.push(current);
  return statements;
}

main();
