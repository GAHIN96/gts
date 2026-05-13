import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wumholworulutftwkqjw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bWhvbHdvcnVsdXRmdHdrcWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTI4OTIsImV4cCI6MjA4MzM2ODg5Mn0.FuZXMiy1JyCXj36-qTnes7_w08FFWz3DH781cw0uIW0";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function findAndMakeAdmin() {
    const email = 'bear46177@gmail.com';
    console.log(`Searching for user with email: ${email}`);

    // Try to fetch all profiles to check visibility
    const { data: allProfiles, error: allProfilesError } = await supabase
        .from('profiles')
        .select('id, email');

    if (allProfilesError) {
        console.error("Error fetching all profiles:", allProfilesError);
    } else {
        console.log(`Found ${allProfiles.length} profiles in total.`);
        const match = allProfiles.find(p => p.email.toLowerCase() === email.toLowerCase());
        if (match) {
            console.log("Found matching profile:", match);
        } else {
            console.log("No profile found with that email in the visible set.");
        }
    }


    // Try to update role
    // First, check if role exists
    const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', profile.id);

    if (roleError) {
        console.error("Error fetching role:", roleError);
    } else {
        console.log("Current roles:", roleData);
    }

    // Attempt to upsert admin role
    const { data: updateData, error: updateError } = await supabase
        .from('user_roles')
        .upsert({ user_id: profile.id, role: 'admin' }, { onConflict: 'user_id,role' });

    if (updateError) {
        console.error("Error updating role to admin:", updateError);
        console.log("Note: This might fail if RLS is enforced and you don't have admin privileges.");
    } else {
        console.log("Successfully made user admin!");
    }
}

findAndMakeAdmin();
