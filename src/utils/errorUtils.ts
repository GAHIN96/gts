export function isAbortError(err: any): boolean {
  if (!err) return false;
  const msg = typeof err === "string" ? err : err.message || "";
  const name = err.name || "";
  return name === "AbortError" || msg.toLowerCase().includes("aborted") || msg.toLowerCase().includes("signal is aborted");
}
