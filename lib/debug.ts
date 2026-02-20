export function debug(tag: string, ...args: unknown[]) {
  if (process.env.ENABLE_DEBUG_LOGS === 'true') {
    console.log(`[${tag}]`, ...args);
  }
}
