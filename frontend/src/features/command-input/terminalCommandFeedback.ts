export const SSH_USAGE_TEXT = `Invalid ssh command.

Usage: ssh [user@]hostname

Examples:
  ssh myuser@192.168.0.10        # Connect to an IP with a specific user`;

export const UNAVAILABLE_COMMAND_TOAST_MESSAGE = "지금은 사용할 수 없는 명령어입니다.";

const UNAVAILABLE_TERMINAL_COMMANDS = new Set([
  "cat",
  "cd",
  "find",
  "ls",
  "nc",
  "override",
  "pwd",
  "rm",
  "sh",
  "tar",
]);

export function getCommandName(inputValue: string | undefined) {
  return inputValue?.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}

export function isSshCommand(inputValue: string | undefined) {
  return getCommandName(inputValue) === "ssh";
}

export function isUnavailableTerminalCommand(inputValue: string | undefined) {
  return UNAVAILABLE_TERMINAL_COMMANDS.has(getCommandName(inputValue));
}
