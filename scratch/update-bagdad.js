import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wumholworulutftwkqjw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bWhvbHdvcnVsdXRmdHdrcWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTI4OTIsImV4cCI6MjA4MzM2ODg5Mn0.FuZXMiy1JyCXj36-qTnes7_w08FFWz3DH781cw0uIW0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function updateName() {
    const idToUpdate = '9a643d02-590a-4de5-b7db-687be180783b';
    console.log(`Updating flight ID: ${idToUpdate} | changing 'bagdad' to 'Baghdad'`);
    
    const { data, error } = await supabase
        .from('flights')
        .update({ departure_city: 'Baghdad' })
        .eq('id', idToUpdate)
        .select();

    if (error) {
        console.error("Error updating flight:", error);
    } else {
        console.log("Update result:", data);
    }
}

updateName();
