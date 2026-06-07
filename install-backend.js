const { spawnSync } = require('child_process');

const execPath = process.env.npm_execpath;
let cmd, args, useShell = false;

if (execPath) {
  if (execPath.endsWith('.js')) {
    cmd = 'node';
    args = [execPath, 'install', '--prefix', 'backend'];
    useShell = false;
  } else {
    cmd = execPath;
    args = ['install', '--prefix', 'backend'];
    useShell = true;
  }
} else {
  cmd = 'npm';
  args = ['install', '--prefix', 'backend'];
  useShell = true;
}

console.log(`Running: ${cmd} ${args.join(' ')}`);

const result = spawnSync(cmd, args, {
  stdio: 'inherit',
  shell: useShell
});

if (result.error) {
  console.error('Failed to start install process:', result.error);
  process.exit(1);
}

process.exit(result.status === null ? 1 : result.status);
