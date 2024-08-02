const { execSync } = require('child_process');
const os = require('os');

const platform = os.platform();
let packageName;

switch (platform) {
  case 'linux':
    packageName = '@rollup/rollup-linux-x64-gnu';
    break;
  case 'darwin':
    packageName = '@rollup/rollup-darwin-x64';
    break;
  case 'win32':
    packageName = '@rollup/rollup-win32-x64';
    break;
  default:
    console.error(`Unsupported platform: ${platform}`);
    process.exit(1);
}

execSync(`npm install ${packageName}`, { stdio: 'inherit' });
