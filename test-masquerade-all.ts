import { usePosStore } from './src/lib/pos-store';

console.log('Testing Developer Masquerade / Support Login for ALL Business Tenants...\n');

const store = usePosStore.getState();

const testTenants = store.tenants;

for (const t of testTenants) {
  console.log(`--- Testing Support Login for Tenant: "${t.name}" ---`);
  store.masqueradeTenant(t.id);

  const updatedState = usePosStore.getState();
  const currentFirm = updatedState.firms.find(f => f.id === updatedState.activeFirmId) || updatedState.firms[0];
  const currentUser = updatedState.currentUser;
  const tenantInfo = updatedState.tenant;

  console.log(`  ✓ Logged In User: ${currentUser?.name} (${currentUser?.email}) [Role: ${currentUser?.role}]`);
  console.log(`  ✓ Active Firm Name: ${currentFirm?.name}`);
  console.log(`  ✓ GSTIN: ${currentFirm?.gstin || tenantInfo.gstin}`);
  console.log(`  ✓ State: ${currentFirm?.stateName} (${currentFirm?.stateCode})`);

  if (currentFirm?.name !== t.name) {
    console.error(`❌ FAILED: Firm name did not match tenant name! Expected: "${t.name}", Got: "${currentFirm?.name}"`);
    process.exit(1);
  }

  if (currentUser?.email !== t.ownerEmail) {
    console.error(`❌ FAILED: User email did not match owner email! Expected: "${t.ownerEmail}", Got: "${currentUser?.email}"`);
    process.exit(1);
  }

  console.log(`  ✅ SUCCESS: Successfully switched to ${t.name}!\n`);
}

console.log('🎉 ALL BUSINESS TENANT MASQUERADE SESSIONS SWITCHED 100% ACCURATELY!');
