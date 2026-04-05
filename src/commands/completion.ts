/**
 * completion command - Generate shell auto-completion scripts
 */

import chalk from 'chalk';
import path from 'path';
import os from 'os';
import type { Command } from 'commander';
import type { CommandContext } from './index.js';

export function register(program: Command, ctx: CommandContext): void {
  program
    .command('completion [shell]')
    .description('Generate or install shell auto-completion script')
    .option('-i, --install', 'Auto-install to shell config file')
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  af completion --install\n' +
        '  af completion powershell --install\n' +
        '  af completion bash\n',
    )
    .action((shell?: string, options?: { install?: boolean }) => {
      // Auto-detect current shell by default
      const targetShell = shell || detectShell();

      if (!targetShell) {
        console.error(chalk.red('Cannot detect current shell, please specify: bash, zsh, fish or powershell'));
        console.log(chalk.dim('\nUsage: af completion <shell>'));
        console.log(chalk.dim('Supported shells: bash, zsh, fish, powershell'));
        process.exit(1);
      }

      const script = generateCompletion(targetShell);

      if (options?.install) {
        installCompletion(targetShell, script, ctx);
      } else {
        console.log(script);
        console.log(chalk.dim('\nTip: Use --install to auto-install to shell config'));
      }
    });
}

function detectShell(): string | null {
  const shell = process.env.SHELL || process.env.ComSpec || '';
  if (shell.includes('bash')) return 'bash';
  if (shell.includes('zsh')) return 'zsh';
  if (shell.includes('fish')) return 'fish';
  if (shell.includes('powershell') || shell.includes('pwsh')) return 'powershell';
  if (process.platform === 'win32') return 'powershell';
  return null;
}

function getShellConfigPath(shell: string): string | null {
  const home = os.homedir();

  switch (shell) {
    case 'bash':
      return path.join(home, '.bashrc');
    case 'zsh':
      return path.join(home, '.zshrc');
    case 'fish':
      return path.join(home, '.config', 'fish', 'completions', 'af.fish');
    case 'powershell':
      // Try to get PowerShell profile path
      const psProfile = process.env.PROFILE;
      if (psProfile) return psProfile;
      return path.join(home, 'Documents', 'WindowsPowerShell', 'Microsoft.PowerShell_profile.ps1');
    default:
      return null;
  }
}

function trimLeadingBlankLines(content: string): string {
  return content.replace(/^(?:\s*\r?\n)+/, '');
}

function buildCompletionBlock(script: string, startMarker: string, endMarker: string): string {
  return `${startMarker}\n${script.trimEnd()}\n${endMarker}`;
}

function joinCompletionSections(...sections: string[]): string {
  const normalized = sections
    .map(section => section.trim())
    .filter(section => section.length > 0);

  if (normalized.length === 0) {
    return '';
  }

  return normalized.join('\n\n') + '\n';
}

function findLineEnd(content: string, startIndex: number): number {
  const newlineIndex = content.indexOf('\n', startIndex);
  return newlineIndex === -1 ? content.length : newlineIndex + 1;
}

function findLegacyPowerShellBlockEnd(content: string, startIndex: number): number {
  const scriptStart = content.indexOf('Register-ArgumentCompleter -Native -CommandName af -ScriptBlock', startIndex);
  if (scriptStart === -1) {
    return content.length;
  }

  const openBraceIndex = content.indexOf('{', scriptStart);
  if (openBraceIndex === -1) {
    return content.length;
  }

  let depth = 0;

  for (let index = openBraceIndex; index < content.length; index += 1) {
    const char = content[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return findLineEnd(content, index);
      }
    }
  }

  return content.length;
}

function findLegacyBlockEnd(content: string, shell: string, startIndex: number): number {
  switch (shell) {
    case 'powershell':
      return findLegacyPowerShellBlockEnd(content, startIndex);
    case 'bash': {
      const commandIndex = content.indexOf('complete -F _af_completion af', startIndex);
      return commandIndex === -1 ? content.length : findLineEnd(content, commandIndex);
    }
    case 'zsh': {
      const commandIndex = content.indexOf('compdef _af_completion af', startIndex);
      return commandIndex === -1 ? content.length : findLineEnd(content, commandIndex);
    }
    default:
      return content.length;
  }
}

function upsertCompletionBlock(
  content: string,
  block: string,
  shell: string,
  startMarker: string,
  endMarker: string
): { content: string; replaced: boolean } {
  const startIndex = content.indexOf(startMarker);

  if (startIndex === -1) {
    return {
      content: joinCompletionSections(content, block),
      replaced: false,
    };
  }

  const endMarkerIndex = content.indexOf(endMarker, startIndex);
  const endIndex = endMarkerIndex === -1
    ? findLegacyBlockEnd(content, shell, startIndex)
    : endMarkerIndex + endMarker.length;
  const before = content.slice(0, startIndex);
  const after = trimLeadingBlankLines(content.slice(endIndex));

  return {
    content: joinCompletionSections(before, block, after),
    replaced: true,
  };
}

function installCompletion(shell: string, script: string, ctx: CommandContext): void {
  const configPath = getShellConfigPath(shell);

  if (!configPath) {
    console.error(chalk.red(`Cannot determine config file path for ${shell}`));
    process.exit(1);
  }

  const startMarker = '# af completion (auto-generated)';
  const endMarker = '# /af completion (auto-generated)';
  const completionBlock = buildCompletionBlock(script, startMarker, endMarker);

  try {
    if (shell === 'fish') {
      // Fish uses a separate completions directory
      const dir = path.dirname(configPath);
      if (!ctx.fileOps.pathExists(dir)) {
        ctx.fileOps.mkdirSync(dir);
      }
      ctx.fileOps.writeFileSync(configPath, completionBlock + '\n');
      console.log(chalk.green(`\n✓ Completion installed to: ${configPath}`));
    } else if (shell === 'powershell') {
      // PowerShell profile
      const dir = path.dirname(configPath);
      if (!ctx.fileOps.pathExists(dir)) {
        ctx.fileOps.mkdirSync(dir);
      }

      let content = '';
      const existingContent = ctx.fileOps.readFileSync(configPath);
      if (existingContent) {
        content = existingContent;
      }

      const result = upsertCompletionBlock(content, completionBlock, shell, startMarker, endMarker);
      ctx.fileOps.writeFileSync(configPath, result.content);
      console.log(chalk.green(`\n✓ Completion ${result.replaced ? 'updated' : 'installed'} to: ${configPath}`));
      console.log(chalk.dim('\nRestart PowerShell or run: . $PROFILE'));
    } else {
      // Bash / Zsh
      let content = '';
      const existingContent = ctx.fileOps.readFileSync(configPath);
      if (existingContent) {
        content = existingContent;
      }

      const result = upsertCompletionBlock(content, completionBlock, shell, startMarker, endMarker);
      ctx.fileOps.writeFileSync(configPath, result.content);
      console.log(chalk.green(`\n✓ Completion ${result.replaced ? 'updated' : 'installed'} to: ${configPath}`));
      console.log(chalk.dim(`\nRestart terminal or run: source ${configPath}`));
    }
  } catch (err) {
    console.error(chalk.red(`Installation failed: ${(err as Error).message}`));
    console.log(chalk.dim('\nYou can manually run this command to install:'));
    console.log(chalk.dim(`  af completion ${shell} >> ${configPath}`));
    process.exit(1);
  }
}

function generateCompletion(shell: string): string {
  switch (shell) {
    case 'bash':
      return generateBashCompletion();
    case 'zsh':
      return generateZshCompletion();
    case 'fish':
      return generateFishCompletion();
    case 'powershell':
      return generatePowerShellCompletion();
    default:
      return `# Unsupported shell: ${shell}`;
  }
}

function generateBashCompletion(): string {
  return `# af completion for bash
_af_completion() {
  local cur prev words cword
  _init_completion || return

  local commands="list show import remove sync add unsync update completion"

  if [[ \${cword} -eq 1 ]]; then
    COMPREPLY=($(compgen -W "\${commands}" -- "\${cur}"))
    return
  fi

  local cmd="\${words[1]}"

  # Second argument: target type
  case "\${cmd}" in
    list|show|import)
      if [[ \${cword} -eq 2 ]]; then
        local targets=$(af __complete \${cmd}-targets 2>/dev/null)
        COMPREPLY=($(compgen -W "\${targets}" -- "\${cur}"))
        return
      fi
      ;;
    remove)
      if [[ \${cword} -eq 2 ]]; then
        local targets=$(af __complete remove-targets 2>/dev/null)
        COMPREPLY=($(compgen -W "\${targets}" -- "\${cur}"))
        return
      fi
      ;;
    add)
      if [[ \${cword} -eq 2 ]]; then
        local targets=$(af __complete add-targets 2>/dev/null)
        COMPREPLY=($(compgen -W "\${targets}" -- "\${cur}"))
        return
      fi
      ;;
    sync|unsync)
      if [[ \${cword} -eq 2 ]]; then
        local targets=$(af __complete \${cmd}-targets 2>/dev/null)
        COMPREPLY=($(compgen -W "\${targets}" -- "\${cur}"))
        return
      fi
      ;;
  esac

  # Third argument: specific ID or name
  local target="\${words[2]}"

  case "\${cmd}" in
    list)
      # list doesn't need third argument completion
      ;;
    show)
      if [[ \${cword} -eq 3 ]]; then
        local items=$(af __complete \${target} 2>/dev/null)
        COMPREPLY=($(compgen -W "\${items}" -- "\${cur}"))
      fi
      ;;
    import)
      if [[ \${cword} -eq 3 ]]; then
        local items=$(af __complete \${target} 2>/dev/null)
        COMPREPLY=($(compgen -W "\${items}" -- "\${cur}"))
      fi
      ;;
    remove)
      if [[ \${cword} -eq 3 ]]; then
        local items=$(af __complete \${target} 2>/dev/null)
        COMPREPLY=($(compgen -W "\${items}" -- "\${cur}"))
      fi
      ;;
    add)
      case "\${target}" in
        agents)
          # add agents [id] - ID is optional, no completion needed
          ;;
        projects)
          if [[ \${cword} -eq 3 ]]; then
            local projects=$(af __complete projects 2>/dev/null)
            COMPREPLY=($(compgen -W "\${projects}" -- "\${cur}"))
          fi
          ;;
      esac
      ;;
    sync)
      case "\${target}" in
        agents|projects)
          if [[ \${cword} -eq 3 ]]; then
            local skills=$(af __complete skills 2>/dev/null)
            COMPREPLY=($(compgen -W "\${skills}" -- "\${cur}"))
          elif [[ \${cword} -ge 4 ]]; then
            if [[ "\${target}" == "agents" ]]; then
              local agents=$(af __complete agents 2>/dev/null)
              COMPREPLY=($(compgen -W "\${agents}" -- "\${cur}"))
            else
              local projects=$(af __complete projects 2>/dev/null)
              COMPREPLY=($(compgen -W "\${projects}" -- "\${cur}"))
            fi
          fi
          ;;
      esac
      ;;
    unsync)
      case "\${target}" in
        agents)
          if [[ \${cword} -eq 3 ]]; then
            local skills=$(af __complete synced-skills 2>/dev/null)
            COMPREPLY=($(compgen -W "\${skills}" -- "\${cur}"))
          elif [[ \${cword} -ge 4 ]]; then
            local skill="\${words[3]}"
            local agents=$(af __complete "synced-agents:\${skill}" 2>/dev/null)
            COMPREPLY=($(compgen -W "\${agents}" -- "\${cur}"))
          fi
          ;;
        projects)
          if [[ \${cword} -eq 3 ]]; then
            local skills=$(af __complete synced-projects-skills 2>/dev/null)
            COMPREPLY=($(compgen -W "\${skills}" -- "\${cur}"))
          elif [[ \${cword} -ge 4 ]]; then
            local skill="\${words[3]}"
            local projects=$(af __complete "synced-projects:\${skill}" 2>/dev/null)
            COMPREPLY=($(compgen -W "\${projects}" -- "\${cur}"))
          fi
          ;;
      esac
      ;;
    update)
      if [[ \${cword} -eq 2 ]]; then
        local skills=$(af __complete skills 2>/dev/null)
        COMPREPLY=($(compgen -W "\${skills}" -- "\${cur}"))
      fi
      ;;
  esac
}

complete -F _af_completion af
`;
}

function generateZshCompletion(): string {
  return `#compdef af

_af_completion() {
  local -a commands
  commands=(
    'list:List resources (agents/projects/skills)'
    'show:Show resource details'
    'import:Import skills from source'
    'remove:Remove resources'
    'sync:Sync skills to Agent or project'
    'add:Add resources (skills/agents/projects)'
    'unsync:Remove sync'
    'update:Update skills'
    'completion:Generate shell auto-completion script'
  )

  if (( CURRENT == 2 )); then
    _describe 'command' commands
    return
  fi

  local cmd="\${words[2]}"

  # Second argument: target type
  case "\${cmd}" in
    list|show|import)
      if (( CURRENT == 3 )); then
        local -a targets
        targets=('agents' 'projects' 'skills')
        _describe 'target' targets
        return
      fi
      ;;
    remove)
      if (( CURRENT == 3 )); then
        local -a targets
        targets=('skills' 'projects' 'agents')
        _describe 'target' targets
        return
      fi
      ;;
    add)
      if (( CURRENT == 3 )); then
        local -a targets
        targets=('skills:Install skills from Git repository' 'agents:Add custom Agent configuration' 'projects:Add project')
        _describe 'target' targets
        return
      fi
      ;;
    sync|unsync)
      if (( CURRENT == 3 )); then
        local -a targets
        targets=('agents' 'projects')
        _describe 'target' targets
        return
      fi
      ;;
  esac

  # Third argument: specific ID or name
  local target="\${words[3]}"

  case "\${cmd}" in
    show|import)
      if (( CURRENT == 4 )); then
        local -a items
        items=($(af __complete "\${target}" 2>/dev/null))
        _describe "\${target}" items
      fi
      ;;
    remove)
      if (( CURRENT == 4 )); then
        local -a items
        items=($(af __complete "\${target}" 2>/dev/null))
        _describe "\${target}" items
      fi
      ;;
    add)
      case "\${target}" in
        projects)
          if (( CURRENT == 4 )); then
            local -a projects
            projects=($(af __complete projects 2>/dev/null))
            _describe 'project' projects
          fi
          ;;
      esac
      ;;
    sync)
      case "\${target}" in
        agents|projects)
          if (( CURRENT == 4 )); then
            local -a skills
            skills=($(af __complete skills 2>/dev/null))
            _describe 'skill' skills
          else
            if [[ "\${target}" == "agents" ]]; then
              local -a agents
              agents=($(af __complete agents 2>/dev/null))
              _describe 'agent' agents
            else
              local -a projects
              projects=($(af __complete projects 2>/dev/null))
              _describe 'project' projects
            fi
          fi
          ;;
      esac
      ;;
    unsync)
      case "\${target}" in
        agents)
          if (( CURRENT == 4 )); then
            local -a skills
            skills=($(af __complete synced-skills 2>/dev/null))
            _describe 'skill' skills
          else
            local skill="\${words[4]}"
            local -a agents
            agents=($(af __complete "synced-agents:\${skill}" 2>/dev/null))
            _describe 'agent' agents
          fi
          ;;
        projects)
          if (( CURRENT == 4 )); then
            local -a skills
            skills=($(af __complete synced-projects-skills 2>/dev/null))
            _describe 'skill' skills
          else
            local skill="\${words[4]}"
            local -a projects
            projects=($(af __complete "synced-projects:\${skill}" 2>/dev/null))
            _describe 'project' projects
          fi
          ;;
      esac
      ;;
    update)
      if (( CURRENT == 3 )); then
        local -a skills
        skills=($(af __complete skills 2>/dev/null))
        _describe 'skill' skills
      fi
      ;;
  esac
}

compdef _af_completion af
`;
}

function generateFishCompletion(): string {
  return `# af completion for fish

complete -c af -f

# First level: commands
complete -c af -n '__fish_use_subcommand' -a 'list' -d 'List resources (agents/projects/skills)'
complete -c af -n '__fish_use_subcommand' -a 'show' -d 'Show resource details'
complete -c af -n '__fish_use_subcommand' -a 'import' -d 'Import skills from source'
complete -c af -n '__fish_use_subcommand' -a 'remove' -d 'Remove resources'
complete -c af -n '__fish_use_subcommand' -a 'sync' -d 'Sync skills to Agent or project'
complete -c af -n '__fish_use_subcommand' -a 'add' -d 'Add resources (skills/agents/projects)'
complete -c af -n '__fish_use_subcommand' -a 'unsync' -d 'Remove sync'
complete -c af -n '__fish_use_subcommand' -a 'update' -d 'Update skills'
complete -c af -n '__fish_use_subcommand' -a 'completion' -d 'Generate shell auto-completion script'

# list, show, import - second argument
complete -c af -n '__fish_seen_subcommand_from list; and not __fish_seen_subcommand_from agents projects skills' -a 'agents' -d 'Agent list'
complete -c af -n '__fish_seen_subcommand_from list; and not __fish_seen_subcommand_from agents projects skills' -a 'projects' -d 'Project list'
complete -c af -n '__fish_seen_subcommand_from list; and not __fish_seen_subcommand_from agents projects skills' -a 'skills' -d 'Skill list'

complete -c af -n '__fish_seen_subcommand_from show; and not __fish_seen_subcommand_from agents projects skills' -a 'agents' -d 'Agent details'
complete -c af -n '__fish_seen_subcommand_from show; and not __fish_seen_subcommand_from agents projects skills' -a 'projects' -d 'Project details'
complete -c af -n '__fish_seen_subcommand_from show; and not __fish_seen_subcommand_from agents projects skills' -a 'skills' -d 'Skill details'

complete -c af -n '__fish_seen_subcommand_from import; and not __fish_seen_subcommand_from agents projects' -a 'agents' -d 'Import from Agent'
complete -c af -n '__fish_seen_subcommand_from import; and not __fish_seen_subcommand_from agents projects' -a 'projects' -d 'Import from project'

# remove - second argument
complete -c af -n '__fish_seen_subcommand_from remove; and not __fish_seen_subcommand_from skills projects agents' -a 'skills' -d 'Remove skill'
complete -c af -n '__fish_seen_subcommand_from remove; and not __fish_seen_subcommand_from skills projects agents' -a 'projects' -d 'Remove project'
complete -c af -n '__fish_seen_subcommand_from remove; and not __fish_seen_subcommand_from skills projects agents' -a 'agents' -d 'Remove Agent configuration'

# add - second argument
complete -c af -n '__fish_seen_subcommand_from add; and not __fish_seen_subcommand_from skills agents projects' -a 'skills' -d 'Install skills from Git repository'
complete -c af -n '__fish_seen_subcommand_from add; and not __fish_seen_subcommand_from skills agents projects' -a 'agents' -d 'Add custom Agent configuration'
complete -c af -n '__fish_seen_subcommand_from add; and not __fish_seen_subcommand_from skills agents projects' -a 'projects' -d 'Add project'

# sync, unsync - second argument
complete -c af -n '__fish_seen_subcommand_from sync; and not __fish_seen_subcommand_from agents projects' -a 'agents' -d 'Sync to Agent'
complete -c af -n '__fish_seen_subcommand_from sync; and not __fish_seen_subcommand_from agents projects' -a 'projects' -d 'Sync to project'
complete -c af -n '__fish_seen_subcommand_from unsync; and not __fish_seen_subcommand_from agents projects' -a 'agents' -d 'Remove Agent sync'
complete -c af -n '__fish_seen_subcommand_from unsync; and not __fish_seen_subcommand_from agents projects' -a 'projects' -d 'Remove project sync'

# show - Third argument: specific ID or name
complete -c af -n '__fish_seen_subcommand_from show; and __fish_seen_subcommand_from agents' -a '(af __complete agents 2>/dev/null)'
complete -c af -n '__fish_seen_subcommand_from show; and __fish_seen_subcommand_from projects' -a '(af __complete projects 2>/dev/null)'
complete -c af -n '__fish_seen_subcommand_from show; and __fish_seen_subcommand_from skills' -a '(af __complete skills 2>/dev/null)'

# import - Third argument
complete -c af -n '__fish_seen_subcommand_from import; and __fish_seen_subcommand_from agents' -a '(af __complete agents 2>/dev/null)'
complete -c af -n '__fish_seen_subcommand_from import; and __fish_seen_subcommand_from projects' -a '(af __complete projects 2>/dev/null)'

# remove - Third argument
complete -c af -n '__fish_seen_subcommand_from remove; and __fish_seen_subcommand_from skills' -a '(af __complete skills 2>/dev/null)'
complete -c af -n '__fish_seen_subcommand_from remove; and __fish_seen_subcommand_from projects' -a '(af __complete projects 2>/dev/null)'
complete -c af -n '__fish_seen_subcommand_from remove; and __fish_seen_subcommand_from agents' -a '(af __complete agents 2>/dev/null)'

# add projects - Third argument
complete -c af -n '__fish_seen_subcommand_from add; and __fish_seen_subcommand_from projects; and test (count (commandline -opc)) -eq 3' -a '(af __complete projects 2>/dev/null)'

# sync agents - skill name, then Agent ID
complete -c af -n '__fish_seen_subcommand_from sync; and __fish_seen_subcommand_from agents; and test (count (commandline -opc)) -eq 3' -a '(af __complete skills 2>/dev/null)'
complete -c af -n '__fish_seen_subcommand_from sync; and __fish_seen_subcommand_from agents; and test (count (commandline -opc)) -ge 4' -a '(af __complete agents 2>/dev/null)'

# sync projects - skill name, then project ID
complete -c af -n '__fish_seen_subcommand_from sync; and __fish_seen_subcommand_from projects; and test (count (commandline -opc)) -eq 3' -a '(af __complete skills 2>/dev/null)'
complete -c af -n '__fish_seen_subcommand_from sync; and __fish_seen_subcommand_from projects; and test (count (commandline -opc)) -ge 4' -a '(af __complete projects 2>/dev/null)'

# unsync agents - synced skills, then synced Agents
complete -c af -n '__fish_seen_subcommand_from unsync; and __fish_seen_subcommand_from agents; and test (count (commandline -opc)) -eq 3' -a '(af __complete synced-skills 2>/dev/null)'
complete -c af -n '__fish_seen_subcommand_from unsync; and __fish_seen_subcommand_from agents; and test (count (commandline -opc)) -ge 4' -a '(af __complete "synced-agents:(commandline -opc | string split \' \' | select 3)" 2>/dev/null)'

# unsync projects - skills synced to projects, then synced projects
complete -c af -n '__fish_seen_subcommand_from unsync; and __fish_seen_subcommand_from projects; and test (count (commandline -opc)) -eq 3' -a '(af __complete synced-projects-skills 2>/dev/null)'
complete -c af -n '__fish_seen_subcommand_from unsync; and __fish_seen_subcommand_from projects; and test (count (commandline -opc)) -ge 4' -a '(af __complete "synced-projects:(commandline -opc | string split \' \' | select 3)" 2>/dev/null)'

# update
complete -c af -n '__fish_seen_subcommand_from update' -a '(af __complete skills 2>/dev/null)'
`;
}

function generatePowerShellCompletion(): string {
  return `# af completion for PowerShell

Register-ArgumentCompleter -Native -CommandName af -ScriptBlock {
  param($wordToComplete, $commandAst, $cursorPosition)

  $commands = @(
    'list', 'show', 'import', 'remove', 'sync', 'add', 'unsync', 'update', 'completion'
  )

  $tokens = $commandAst.CommandElements | ForEach-Object { $_.Value }
  $tokenCount = $tokens.Count

  if ($tokenCount -eq 1) {
    $commands | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
      [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
    }
    return
  }

  $cmd = $tokens[1]

  # Second argument: target type
  switch ($cmd) {
    { $_ -in 'list', 'show', 'import' } {
      if ($tokenCount -eq 2) {
        @('agents', 'projects', 'skills') | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
          [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
        }
        return
      }
    }
    'remove' {
      if ($tokenCount -eq 2) {
        @('skills', 'projects', 'agents') | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
          [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
        }
        return
      }
    }
    'add' {
      if ($tokenCount -eq 2) {
        @('skills', 'agents', 'projects') | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
          [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
        }
        return
      }
    }
    'sync' {
      if ($tokenCount -eq 2) {
        @('agents', 'projects') | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
          [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
        }
        return
      }
    }
    'unsync' {
      if ($tokenCount -eq 2) {
        @('agents', 'projects') | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
          [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
        }
        return
      }
    }
  }

  # Third argument and beyond
  if ($tokenCount -ge 3) {
    $target = $tokens[2]

    switch ($cmd) {
      'list' {
        if ($tokenCount -eq 3 -and $target -in 'agents', 'projects', 'skills' -and [string]::IsNullOrEmpty($wordToComplete)) {
          # Prevent PowerShell from falling back to filesystem paths when the command is already complete.
          [System.Management.Automation.CompletionResult]::new(' ', '(complete)', 'ParameterValue', 'No more arguments')
          return
        }
      }
      'show' {
        $items = af __complete $target 2>$null
        if ($items) {
          $items | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
          }
        }
      }
      'import' {
        $items = af __complete $target 2>$null
        if ($items) {
          $items | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
          }
        }
      }
      'remove' {
        $items = af __complete $target 2>$null
        if ($items) {
          $items | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
          }
        }
      }
      'add' {
        if ($target -eq 'projects') {
          $projects = af __complete projects 2>$null
          if ($projects) {
            $projects | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
              [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
            }
          }
        }
      }
      'sync' {
        switch ($target) {
          'agents' {
            if ($tokenCount -eq 3) {
              $skills = af __complete skills 2>$null
              if ($skills) {
                $skills | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
                  [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
                }
              }
            } else {
              $agents = af __complete agents 2>$null
              if ($agents) {
                $agents | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
                  [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
                }
              }
            }
          }
          'projects' {
            if ($tokenCount -eq 3) {
              $skills = af __complete skills 2>$null
              if ($skills) {
                $skills | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
                  [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
                }
              }
            } else {
              $projects = af __complete projects 2>$null
              if ($projects) {
                $projects | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
                  [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
                }
              }
            }
          }
        }
      }
      'unsync' {
        switch ($target) {
          'agents' {
            if ($tokenCount -eq 3) {
              $skills = af __complete synced-skills 2>$null
              if ($skills) {
                $skills | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
                  [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
                }
              }
            } else {
              $skill = $tokens[3]
              $agents = af __complete "synced-agents:$skill" 2>$null
              if ($agents) {
                $agents | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
                  [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
                }
              }
            }
          }
          'projects' {
            if ($tokenCount -eq 3) {
              $skills = af __complete synced-projects-skills 2>$null
              if ($skills) {
                $skills | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
                  [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
                }
              }
            } else {
              $skill = $tokens[3]
              $projects = af __complete "synced-projects:$skill" 2>$null
              if ($projects) {
                $projects | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
                  [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
                }
              }
            }
          }
        }
      }
      'update' {
        $skills = af __complete skills 2>$null
        if ($skills) {
          $skills | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
          }
        }
      }
    }
  }
}
`;
}

