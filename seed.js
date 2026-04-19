import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
// Bun handles .env automatically

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Deleting old questions...");
  const { error: deleteError } = await supabase
    .from('quiz_questions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
    
  if (deleteError) {
    console.error("Failed to delete old questions:", deleteError);
  } else {
    console.log("Successfully deleted old questions.");
  }

  const employability = JSON.parse(fs.readFileSync('../../Data Files/employability_skills_2nd_year_IMPORT.json', 'utf8'));
  const ictsm = JSON.parse(fs.readFileSync('../../Data Files/ictsm_theory_2nd_year_IMPORT.json', 'utf8'));

  const insertChunked = async (data, name) => {
    console.log(`Inserting ${data.length} questions from ${name}...`);
    for (let i = 0; i < data.length; i += 100) {
      const chunk = data.slice(i, i + 100);
      const { error } = await supabase.from('quiz_questions').insert(chunk);
      if (error) {
        console.error(`Error inserting chunk for ${name}:`, error);
      }
    }
  };

  await insertChunked(employability, 'employability');
  await insertChunked(ictsm, 'ictsm');

  console.log("Done replacing old questions with new ones from the JSON files!");
}

main();
