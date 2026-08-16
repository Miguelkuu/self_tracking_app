import "dotenv/config";
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("Usage: npx tsx scripts/debug-login.ts <password>");
  process.exit(1);
}

console.log("ADMIN_USERNAME:", JSON.stringify(process.env.ADMIN_USERNAME));
console.log("ADMIN_PASSWORD_HASH:", JSON.stringify(process.env.ADMIN_PASSWORD_HASH));

const result = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH!);
console.log("Password matches:", result);
