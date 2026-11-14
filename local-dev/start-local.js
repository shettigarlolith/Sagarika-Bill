/*
 * Safe local run: `npm run local`
 * - Forces Excel storage in local-dev/data (never the live Google Sheets).
 * - Creates the two branch admin logins on first run, with random passwords
 *   saved to local-dev/test-logins.txt (git-ignored).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = __dirname;
const dataDir = path.join(root, 'data');
const loginsFile = path.join(root, 'test-logins.txt');
fs.mkdirSync(dataDir, { recursive: true });

let logins = {};
if (fs.existsSync(loginsFile)) {
  fs.readFileSync(loginsFile, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^(\w+)\s*=\s*(\S+)/);
    if (m) logins[m[1]] = m[2];
  });
}
if (!logins.sagaraadmin || !logins.pakshikereadmin) {
  logins = {
    sagaraadmin: crypto.randomBytes(6).toString('base64url'),
    pakshikereadmin: crypto.randomBytes(6).toString('base64url')
  };
  fs.writeFileSync(
    loginsFile,
    `# Local test logins (only for npm run local; not used anywhere else)\nsagaraadmin = ${logins.sagaraadmin}\npakshikereadmin = ${logins.pakshikereadmin}\n`
  );
}

process.env.SAGARIKA_STORAGE = 'excel';
process.env.SAGARIKA_DATA_DIR = dataDir;
process.env.SAGARIKA_ADMIN_PASSWORD_SAGARA = logins.sagaraadmin;
process.env.SAGARIKA_ADMIN_PASSWORD_PAKSHIKERE = logins.pakshikereadmin;
process.env.SAGARIKA_SESSION_SECRET = process.env.SAGARIKA_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
delete process.env.GOOGLE_PRIVATE_KEY;

const app = require('../server.js');
const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Local test server: http://localhost:${port}  (Excel data in local-dev/data)`);
  console.log(`Test logins: ${path.relative(process.cwd(), loginsFile)}`);
});
