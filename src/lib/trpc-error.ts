/** tRPC puts the error code in `data`; hooks and boundaries read it the same way. */
export function errorCode(error: unknown): string | null {
  if (error && typeof error === "object" && "data" in error) {
    return (error as { data?: { code?: string } }).data?.code ?? null;
  }
  return null;
}

export function isNotFound(error: unknown): boolean {
  return errorCode(error) === "NOT_FOUND";
}
