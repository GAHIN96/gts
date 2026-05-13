import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wumholworulutftwkqjw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bWhvbHdvcnVsdXRmdHdrcWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTI4OTIsImV4cCI6MjA4MzM2ODg5Mn0.FuZXMiy1JyCXj36-qTnes7_w08FFWz3DH781cw0uIW0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifyAndDelete() {
    const idToDelete = '9a643d02-590a-4de5-b7db-687be180783b';
    
    const { data: flight, error: getError } = await supabase
        .from('flights')
        .select('*')
        .eq('id', idToDelete)
        .maybeSingle();

    if (getError) {
        console.error("Error fetching flight:", getError);
        return;
    }

    if (!flight) {
        console.log("Flight not found. Already deleted?");
    } else {
        console.log("Flight found:", flight);
        const { error: delError } = await supabase
            .from('flights')
            .delete()
            .eq('id', idToDelete);
        
        if (delError) {
            console.error("Error deleting flight:", delError);
        } else {
            console.log("Successfully deleted flight.");
        }
    }
}

verifyAndDelete();
