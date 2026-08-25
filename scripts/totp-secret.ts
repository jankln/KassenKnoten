/**
 * Generate the second-factor secret and everything needed to enrol a phone.
 *
 * Run with: npm run auth:totp
 *
 * Built in the shape of `scripts/hash-password.ts`, and for the same reason: the secret
 * belongs in the environment, not in the database. A copy of the SQLite file must not be
 * a copy of the second factor — see the auth section of docs/PLAN.md.
 *
 * That choice also removes a whole mechanism. Losing the phone is not a lockout, because
 * the secret is still in `.env` and can simply be scanned again, so there are no recovery
 * codes to print, store and eventually lose.
 */
import { renderANSI } from "uqr";
import { generateSecret, otpauthUri } from "../lib/auth/totp.ts";

const secret = generateSecret();
const uri = otpauthUri({ secret });

console.log("\nAdd this line to your .env file:\n");
console.log(`TOTP_SECRET=${secret}\n`);
console.log("Then scan this with your authenticator app:\n");
console.log(renderANSI(uri, { border: 1 }));
console.log("Or enter the secret by hand:\n");
// Grouped in fours: this gets typed on a phone keyboard, and a wall of thirty-two
// characters is where people lose their place.
console.log(`  ${(secret.match(/.{1,4}/g) ?? []).join(" ")}\n`);
console.log(`Full URI: ${uri}\n`);
console.log("Restart the app afterwards. Until TOTP_SECRET is set, the login asks");
console.log("for the household password alone, exactly as before.\n");
