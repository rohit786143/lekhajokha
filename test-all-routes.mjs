import http from 'http';

const routes = [
  '/',
  '/admin/login',
  '/admin/dashboard',
  '/staff',
  '/login',
  '/pos',
  '/inventory',
  '/inventory/categories',
  '/inventory/quick-inward',
  '/purchases',
  '/quotations',
  '/returns',
  '/tools/barcode-generator',
  '/settings/company',
  '/reports/profit-loss'
];

async function checkRoute(path) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          path,
          statusCode: res.statusCode,
          hasContent: data.length > 500,
          length: data.length
        });
      });
    });
    req.on('error', (err) => {
      resolve({ path, error: err.message });
    });
  });
}

async function run() {
  console.log('Testing VyaparFlow Enterprise ERP Routes...\n');
  let allPass = true;
  for (const r of routes) {
    const res = await checkRoute(r);
    if (res.error || res.statusCode !== 200) {
      console.error(`❌ FAIL: ${r} - status: ${res.statusCode}, error: ${res.error}`);
      allPass = false;
    } else {
      console.log(`✅ PASS: ${r} (HTTP ${res.statusCode}, bytes: ${res.length})`);
    }
  }

  if (allPass) {
    console.log('\n🎉 ALL 14 ROUTES RETURNED HTTP 200 OK!');
  } else {
    console.error('\n⚠️ SOME ROUTES FAILED');
    process.exit(1);
  }
}

run();
