import process from 'node:process';
import { execSync } from 'node:child_process';

const portArg = process.argv[2];
const port = Number(portArg);

if (!Number.isFinite(port) || port <= 0) {
  console.error(`Usage: node scripts/kill-port.mjs <port>. Got: ${portArg}`);
  process.exit(2);
}

function run(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
}

try {
  // Windows: find PID(s) listening on the port and kill them.
  const out = run(
    `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"`,
  )
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const pids = [...new Set(out.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0))];
  if (pids.length === 0) process.exit(0);

  for (const pid of pids) {
    try {
      run(`powershell -NoProfile -Command "Stop-Process -Id ${pid} -Force"`);
      // eslint-disable-next-line no-console
      console.log(`[kill-port] Freed :${port} (killed PID ${pid})`);
    } catch {
      // ignore
    }
  }
} catch {
  // If this fails (e.g., non-Windows environment), don't block dev startup.
  process.exit(0);
}

