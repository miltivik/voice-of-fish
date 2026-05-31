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

/**
 * Configure mock Tauri command return values.
 * Call in beforeEach. Unknown commands return null.
 */
export function setupTauriMocks(commands: Record<string, unknown>) {
  const invokeMock = (globalThis as Record<string, unknown>)
    .__tauriInvoke as (cmd: string) => unknown;
  if (!invokeMock) return;

  (invokeMock as { mockImplementation: (impl: (cmd: string) => unknown) => void })
    .mockImplementation((cmd: string): unknown => {
      if (cmd in commands) return commands[cmd];
      return null;
    });
}
