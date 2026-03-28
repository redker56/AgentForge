#!/usr/bin/env node
/**
 * npm postinstall script
 * Does not auto-modify user shell config, only provides manual enable hint
 */

// Main function
function main() {
  if (process.env.CI || process.env.AGENTFORGE_DISABLE_POSTINSTALL_HINT === '1') {
    return;
  }

  console.log('  AgentForge has been installed.');
  console.log('  Shell completion will not auto-modify your config by default.');
  console.log('  To enable completion, run:');
  console.log('    af completion --install');
}

main();
