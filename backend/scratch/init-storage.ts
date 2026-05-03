import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initStorage() {
  console.log('Checking Supabase buckets...');
  const { data, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('Error listing buckets:', error);
    return;
  }

  const buckets = data.map(b => b.name);
  console.log('Existing buckets:', buckets);

  if (!buckets.includes('hairlink')) {
    console.log('Creating "hairlink" bucket...');
    const { error: createError } = await supabase.storage.createBucket('hairlink', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      fileSizeLimit: 10485760 // 10MB
    });
    if (createError) console.error('Error creating bucket:', createError);
    else console.log('Bucket "hairlink" created successfully.');
  } else {
    console.log('Bucket "hairlink" already exists.');
  }
}

initStorage();
