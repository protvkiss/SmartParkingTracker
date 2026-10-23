export function generateSessionToken() {
  const timeHex = Date.now().toString(16);
  const entropy = Math.random().toString(36).substring(2, 8);
  return `session_${timeHex}_${entropy}`;
}
