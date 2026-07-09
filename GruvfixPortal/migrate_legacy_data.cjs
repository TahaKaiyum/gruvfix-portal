const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indya25tZWlmdnlvd3VpZm9tcG1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NzIyMjUsImV4cCI6MjA5ODE0ODIyNX0.Qc0_4K5tqGwlZVxVu3LGFUoGxsSt4tckFNDYxgKXNOM";
const baseUrl = "https://wrknmeifvyowuifompms.supabase.co/rest/v1";

async function runMigration() {
    console.log("=== STARTING LEGACY METADATA MIGRATION ===");

    try {
        // 1. Fetch legacy customer configuration rows
        const custRes = await fetch(`${baseUrl}/customers`, {
            headers: { "apikey": key, "Authorization": `Bearer ${key}` }
        });
        if (!custRes.ok) {
            console.error("Failed to fetch legacy customers rows:", await custRes.text());
            process.exit(1);
        }
        const customers = await custRes.json();

        // 2. Migrate Machines
        const machinesRecord = customers.find(c => c.name === '__MACHINES');
        if (machinesRecord && machinesRecord.notes) {
            console.log("\nMigrating machines...");
            const machines = JSON.parse(machinesRecord.notes);
            
            // Clear new table
            await fetch(`${baseUrl}/machines?id=neq._temp_`, {
                method: "DELETE",
                headers: { "apikey": key, "Authorization": `Bearer ${key}` }
            });

            // Insert into new table
            const insRes = await fetch(`${baseUrl}/machines`, {
                method: "POST",
                headers: {
                    "apikey": key,
                    "Authorization": `Bearer ${key}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(machines.map(m => ({
                    id: m.id,
                    name: m.name,
                    condition: m.condition,
                    years_of_use: m.yearsOfUse
                })))
            });

            if (insRes.ok) {
                console.log(`   [SUCCESS] Migrated ${machines.length} machines.`);
            } else {
                console.error("   [ERROR] Failed to insert machines:", await insRes.text());
            }
        } else {
            console.log("\nNo legacy __MACHINES row found. Skipping.");
        }

        // 3. Migrate Announcements and Schedules
        const settingsRecord = customers.find(c => c.name === '__SYSTEM_SETTINGS');
        if (settingsRecord && settingsRecord.notes) {
            console.log("\nMigrating system settings (schedules & announcements)...");
            const settingsObj = JSON.parse(settingsRecord.notes);

            // A. Migrate Announcements
            if (settingsObj.announcements && settingsObj.announcements.length > 0) {
                await fetch(`${baseUrl}/announcements?id=neq._temp_`, {
                    method: "DELETE",
                    headers: { "apikey": key, "Authorization": `Bearer ${key}` }
                });

                const insAnn = await fetch(`${baseUrl}/announcements`, {
                    method: "POST",
                    headers: {
                        "apikey": key,
                        "Authorization": `Bearer ${key}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(settingsObj.announcements.map(a => ({
                        id: a.id,
                        text: a.text,
                        date: a.date,
                        type: a.type
                    })))
                });

                if (insAnn.ok) {
                    console.log(`   [SUCCESS] Migrated ${settingsObj.announcements.length} announcements.`);
                } else {
                    console.error("   [ERROR] Failed to insert announcements:", await insAnn.text());
                }
            }

            // B. Migrate Schedules
            if (settingsObj.schedule && settingsObj.schedule.length > 0) {
                await fetch(`${baseUrl}/schedules?id=neq.-1`, {
                    method: "DELETE",
                    headers: { "apikey": key, "Authorization": `Bearer ${key}` }
                });

                const insSched = await fetch(`${baseUrl}/schedules`, {
                    method: "POST",
                    headers: {
                        "apikey": key,
                        "Authorization": `Bearer ${key}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(settingsObj.schedule.map(s => ({
                        time: s.time,
                        text: s.text
                    })))
                });

                if (insSched.ok) {
                    console.log(`   [SUCCESS] Migrated ${settingsObj.schedule.length} schedules.`);
                } else {
                    console.error("   [ERROR] Failed to insert schedules:", await insSched.text());
                }
            }
        } else {
            console.log("\nNo legacy __SYSTEM_SETTINGS row found. Skipping.");
        }

        console.log("\n=== MIGRATION SCRIPT EXECUTION COMPLETE ===");
    } catch (err) {
        console.error("Migration runtime error:", err);
    }
}

runMigration();
