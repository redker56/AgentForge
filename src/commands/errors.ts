export class CommandExit extends Error {
  constructor(
    readonly exitCode: number,
    message = `Command exited with code ${exitCode}`
  ) {
    super(message);
    this.name = 'CommandExit';
  }
}

export function exitCommand(exitCode = 1): never {
  throw new CommandExit(exitCode);
}

export function isCommandExit(error: unknown): error is CommandExit {
  return error instanceof CommandExit;
}
