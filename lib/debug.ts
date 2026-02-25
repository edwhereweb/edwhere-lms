export function debug(tag: string, ...args: unknown[]) {
  if (process.env.ENABLE_DEBUG_LOGS === 'true') {
    console.log(`[${tag}]`, ...args);
  }
}

export function logError(tag: string, error: unknown) {
  const message = error instanceof Error ? error.message : error;
  console.error(`[${tag}]`, message);
}
