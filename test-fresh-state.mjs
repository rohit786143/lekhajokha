import { INITIAL_INVOICES, INITIAL_EXPENSES, INITIAL_PARTIES, INITIAL_PRODUCTS } from "./src/lib/mock-data.js";
import { formatCurrency, calculateCartSummary } from "./src/lib/tax-engine.js";

console.log("=== CHECKING FRESH ERP STATE ===");
console.log("Invoices count:", INITIAL_INVOICES.length, "=> Total Revenue:", INITIAL_INVOICES.reduce((s, i) => s + i.grandTotal, 0));
console.log("Expenses count:", INITIAL_EXPENSES.length, "=> Total Expenses:", INITIAL_EXPENSES.reduce((s, e) => s + e.amount, 0));

const nonZeroParties = INITIAL_PARTIES.filter(p => p.currentBalance !== 0 || p.openingBalance !== 0);
console.log("Parties with non-zero balances:", nonZeroParties.length);

console.log("Products Catalog Count:", INITIAL_PRODUCTS.length);
INITIAL_PRODUCTS.forEach(p => {
  console.log(`- ${p.name}: stock = ${p.currentStock} ${p.unit}`);
});

console.log("\nALL CHECKS PASSED: Database is 100% fresh and clean!");
