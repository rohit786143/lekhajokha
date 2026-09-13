import { usePosStore } from './src/lib/pos-store';

async function runTest() {
  console.log('Testing Business Owner -> Employee Creation & Login Flow...\n');

  const store = usePosStore.getState();

  // 1. Verify Super Admin State (Only Tenants/Business Owners)
  console.log('1. Super Admin Platform Registry:');
  console.log(`- Total Registered Businesses: ${store.tenants.length}`);
  store.tenants.forEach((t) => {
    console.log(`  🏢 Business: "${t.name}" | Owner: ${t.ownerName} (${t.ownerEmail}) | Plan: ${t.plan}`);
  });

  // 2. Business Owner creates a new Employee
  console.log('\n2. Business Owner adds a new Employee (Cashier):');
  const newEmployee = {
    id: `usr-${Date.now()}`,
    tenantId: store.tenant.id,
    name: 'Rohan Sharma (Counter 2)',
    email: 'rohan.cashier@vyaparflow.enterprise',
    phone: '9820011223',
    role: 'CASHIER' as const,
    password: 'rohanpassword123',
    pin: '7788',
    isActive: true,
    permissions: {
      canEditBackdatedInvoices: false,
      canViewPurchaseRates: false,
      canViewProfitMargins: false,
      canGiveBillDiscounts: true,
      canDeleteInvoices: false,
      canManageUsers: false,
      canAccessSettings: false,
    },
    createdAt: new Date().toISOString(),
  };

  store.addStaffUser(newEmployee);
  console.log(`✅ Employee "${newEmployee.name}" created with Username: "${newEmployee.email}" & Password: "${newEmployee.password}"`);

  // 3. Employee attempts login with their credentials
  console.log('\n3. Employee signs in on /login:');
  const loginResult = await store.loginUser('rohan.cashier@vyaparflow.enterprise', 'rohanpassword123', 'CASHIER');

  if (loginResult.success && loginResult.user) {
    console.log(`✅ Login SUCCESSFUL! Logged in as: ${loginResult.user.name}`);
    console.log(`- Assigned Role: ${loginResult.user.role}`);
    console.log(`- Can View Margins: ${loginResult.user.permissions.canViewProfitMargins}`);
    console.log(`- Destination Workstation: /pos`);
  } else {
    console.error(`❌ Login FAILED: ${loginResult.error}`);
    process.exit(1);
  }

  console.log('\n🎉 ALL OWNER & EMPLOYEE FLOWS PASSED SUCCESSFULLY!');
}
runTest();
