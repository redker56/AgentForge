/**
 * Program entry point -- routes to TUI mode or CLI mode
 */

import { launchCLI } from './cli.js';
import { launchTUI } from './tui.js';

const args = process.argv.slice(2);

if (args.includes('--cli')) {
  launchCLI();
} else if (args.length === 0 || args.includes('--tui')) {
  if (!process.stdin.isTTY) {
    launchCLI();
  } else {
    launchTUI();
  }
} else {
  launchCLI();
}
