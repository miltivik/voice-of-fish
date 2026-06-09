/**
 * Shared test utility for mocking Tauri IPC invoke calls.
 *
 * The actual `vi.mock("@tauri-apps/api/core")` runs in vitest.setup.ts
 * (before any test file), ensuring transitive mocks work for @/lib/tauri.
 *
 * Usage:
 *   import { setupTauriMocks } from "@/test-utils/tauri-mocks";
 *   beforeEach(() => setupTauriMocks({ get_system_info: {...} }));
 */

export type TauriMockHandler = (args?: unknown) => unknown;
export type TauriMockValue = unknown | TauriMockHandler;

/**
 * Configure mock Tauri command return values.
 * Call in beforeEach. Unknown commands return null.
 * Values can be static or handler functions (for dynamic responses).
 */
export function setupTauriMocks(commands: Record<string, TauriMockValue>) {
  const invokeMock = (globalThis as Record<string, unknown>)
    .__tauriInvoke as {
      mockImplementation: (impl: (cmd: string, args?: unknown) => unknown) => void;
    } | undefined;
  if (!invokeMock) return;
  invokeMock.mockImplementation((cmd: string, args?: unknown): unknown => {
    if (!(cmd in commands)) return null;
    const value = commands[cmd];
    return typeof value === "function" ? (value as TauriMockHandler)(args) : value;
  });
}
