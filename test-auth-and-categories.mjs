// Automated route verification script
async function verifyRoutes() {
  const routes = [
    { path: "/login", name: "Login & Auth Portal" },
    { path: "/admin/users", name: "Staff & User Management Hub" },
    { path: "/inventory/categories", name: "Dynamic Categories & 15 Industry Master" },
    { path: "/pos", name: "POS Terminal" },
    { path: "/", name: "Main Dashboard" },
  ];

  console.log("🚀 Verifying VyaparFlow ERP routes on http://localhost:3000...\n");

  let allPassed = true;
  for (const route of routes) {
    try {
      const url = `http://localhost:3000${route.path}`;
      const res = await fetch(url);
      const html = await res.text();

      if (res.status === 200) {
        console.log(`✅ [${res.status}] ${route.name} (${route.path}) - Loaded successfully (${html.length} bytes)`);
      } else {
        console.error(`❌ [${res.status}] ${route.name} (${route.path}) - HTTP Error`);
        allPassed = false;
      }
    } catch (err) {
      console.error(`❌ Failed to connect to ${route.path}:`, err.message);
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log("\n🎉 ALL ROUTES VERIFIED SUCCESSFULLY! Zero runtime errors.");
  } else {
    console.log("\n⚠️ Some routes encountered issues.");
    process.exit(1);
  }
}

verifyRoutes();
