const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
};

function stamp(): string {
  return new Date().toLocaleTimeString("id-ID", { hour12: false });
}

function write(color: string, tag: string, args: unknown[]) {
  console.log(
    `${COLORS.dim}${stamp()}${COLORS.reset} ${color}${tag}${COLORS.reset}`,
    ...args,
  );
}

export const log = {
  info: (...args: unknown[]) => write(COLORS.cyan, "info ", args),
  ok: (...args: unknown[]) => write(COLORS.green, "ok   ", args),
  warn: (...args: unknown[]) => write(COLORS.yellow, "warn ", args),
  error: (...args: unknown[]) => write(COLORS.red, "error", args),
};
