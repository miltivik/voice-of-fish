import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, vi } from "vitest";
import { useAppStore } from "@/stores/useAppStore";
import { AppShell } from "./AppShell";

const mockGetAppConfig = vi.fn();
const mockSaveAppConfig = vi.fn();
const mockCheckBinaryExists = vi.fn();
const mockCheckFileExists = vi.fn();
const mockOpenFilePicker = vi.fn();
const mockOpenFolderPicker = vi.fn();
const mockOpenExternalLink = vi.fn();

vi.mock("@/lib/tauri", () => ({
  studioClient: {
    getSystemInfo: vi.fn().mockResolvedValue({}),
    getAppConfig: (...args: unknown[]) => mockGetAppConfig(...args),
    saveAppConfig: (...args: unknown[]) => mockSaveAppConfig(...args),
    listLocalModels: vi.fn().mockResolvedValue([]),
    downloadModel: vi.fn(),
    deleteModel: vi.fn(),
    runGeneration: vi.fn(),
    getGenerationStatus: vi.fn().mockResolvedValue(null),
    cancelGeneration: vi.fn(),
    readGenerationLogs: vi.fn().mockResolvedValue([]),
    getLastCommand: vi.fn().mockResolvedValue("<binary> -m <path>"),
    openOutputFolder: vi.fn(),
  },
  checkBinaryExists: (...args: unknown[]) => mockCheckBinaryExists(...args),
  checkFileExists: (...args: unknown[]) => mockCheckFileExists(...args),
  openFilePicker: (...args: unknown[]) => mockOpenFilePicker(...args),
  openFolderPicker: (...args: unknown[]) => mockOpenFolderPicker(...args),
  openExternalLink: (...args: unknown[]) => mockOpenExternalLink(...args),
  tauriClient: {},
  mockClient: {},
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

async function waitForWizard() {
  await screen.findByRole("heading", { name: /connect s2\.cpp/i });
}

async function fillBinaryAndProceed(user: ReturnType<typeof userEvent.setup>) {
  await waitForWizard();
  const binaryInput = screen.getByLabelText(/connect s2\.cpp/i);
  await user.type(binaryInput, "C:\\s2\\s2.exe");
  await user.tab();
  await waitFor(() => {
    expect(screen.getByText(/binary found/i)).toBeVisible();
  });
  await user.click(screen.getByRole("button", { name: /continue/i }));
}

async function fillModelAndProceed(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /q6/i }));
  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: /continue/i }),
    ).not.toBeDisabled();
  });
  await user.click(screen.getByRole("button", { name: /continue/i }));
}

async function fillOutputAndFinish(user: ReturnType<typeof userEvent.setup>) {
  const outputInput = screen.getByLabelText(/output folder/i);
  await user.clear(outputInput);
  await user.type(outputInput, "C:\\voice-of-fish\\outputs");
  await user.tab();
  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: /finish setup/i }),
    ).not.toBeDisabled();
  });
  await user.click(screen.getByRole("button", { name: /finish setup/i }));
}

async function completeSetup(user: ReturnType<typeof userEvent.setup>) {
  await fillBinaryAndProceed(user);
  await fillModelAndProceed(user);
  await fillOutputAndFinish(user);
}

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAppStore.setState({ setupComplete: false, config: undefined });
    mockCheckBinaryExists.mockResolvedValue(false);
    mockCheckFileExists.mockResolvedValue(false);
    mockOpenFilePicker.mockResolvedValue(null);
    mockOpenFolderPicker.mockResolvedValue(null);
    mockOpenExternalLink.mockResolvedValue(undefined);
  });
  afterEach(() => {
    localStorage.clear();
    useAppStore.setState({ setupComplete: false, config: undefined });
  });

  it("keeps setup incomplete when persisted config has no binaryPath", async () => {
    const config = {
      mode: "simple" as const,
      binaryPath: "",
      modelsPath: "C:\\voice-of-fish\\models",
      outputsPath: "C:\\voice-of-fish\\outputs",
      defaultModelId: "s2-q6",
      defaultAudioFormat: "wav" as const,
      cpuThreads: 8,
      gpuEnabled: true,
      advancedArgs: {},
    };
    mockGetAppConfig.mockResolvedValue(config);

    render(<AppShell />, { wrapper });

    await waitFor(() => {
      expect(useAppStore.getState().config).toEqual(config);
    });
    expect(useAppStore.getState().setupComplete).toBe(false);
    expect(
      await screen.findByRole("heading", { name: /connect s2\.cpp/i }),
    ).toBeVisible();
    expect(
      screen.getByText(/voice of fish does not install the engine/i),
    ).toBeVisible();
    expect(screen.getByText(/Necesitas instalar s2\.cpp/i)).toBeVisible();
  });

  it("shows app shell when persisted config has binaryPath", async () => {
    const config = {
      mode: "simple" as const,
      binaryPath: "C:\\s2\\s2.exe",
      modelsPath: "C:\\voice-of-fish\\models",
      outputsPath: "C:\\voice-of-fish\\outputs",
      defaultModelId: "s2-q6",
      defaultAudioFormat: "wav" as const,
      cpuThreads: 8,
      gpuEnabled: true,
      advancedArgs: {},
    };
    mockGetAppConfig.mockResolvedValue(config);
    mockCheckBinaryExists.mockResolvedValue(true);

    render(<AppShell />, { wrapper });

    await waitFor(() => {
      expect(useAppStore.getState().setupComplete).toBe(true);
    });
    expect(useAppStore.getState()).toMatchObject({
      config,
      setupComplete: true,
    });
  });

  it("does not show sidebar or navigation links during setup", async () => {
    mockGetAppConfig.mockResolvedValue({
      mode: "simple" as const,
      binaryPath: "",
      modelsPath: "C:\\voice-of-fish\\models",
      outputsPath: "C:\\voice-of-fish\\outputs",
      defaultModelId: "s2-q6",
      defaultAudioFormat: "wav" as const,
      cpuThreads: 8,
      gpuEnabled: true,
      advancedArgs: {},
    });

    render(<AppShell />, { wrapper });

    await screen.findByRole("heading", { name: /connect s2\.cpp/i });

    expect(
      screen.queryByRole("navigation", { name: /primary/i }),
    ).not.toBeInTheDocument();
  });

  it("shows sidebar with navigation links after successful setup save", async () => {
    const user = userEvent.setup();
    mockGetAppConfig.mockResolvedValue({
      mode: "simple" as const,
      binaryPath: "",
      modelsPath: "C:\\voice-of-fish\\models",
      outputsPath: "C:\\voice-of-fish\\outputs",
      defaultModelId: "s2-q6",
      defaultAudioFormat: "wav" as const,
      cpuThreads: 8,
      gpuEnabled: true,
      advancedArgs: {},
    });
    mockSaveAppConfig.mockResolvedValue({
      mode: "simple" as const,
      binaryPath: "C:\\s2\\s2.exe",
      modelsPath: "C:\\voice-of-fish\\models",
      outputsPath: "C:\\voice-of-fish\\outputs",
      defaultModelId: "s2-q6",
      defaultAudioFormat: "wav" as const,
      cpuThreads: 8,
      gpuEnabled: true,
      advancedArgs: {},
    });
    mockCheckBinaryExists.mockResolvedValue(true);
    mockCheckFileExists.mockResolvedValue(true);

    render(<AppShell />, { wrapper });

    await completeSetup(user);

    expect(mockSaveAppConfig).toHaveBeenCalled();
    expect(
      await screen.findByRole("navigation", { name: /primary/i }),
    ).toBeVisible();
  });

  it("stays on setup when save fails", async () => {
    const user = userEvent.setup();
    mockGetAppConfig.mockResolvedValue({
      mode: "simple" as const,
      binaryPath: "",
      modelsPath: "C:\\voice-of-fish\\models",
      outputsPath: "C:\\voice-of-fish\\outputs",
      defaultModelId: "s2-q6",
      defaultAudioFormat: "wav" as const,
      cpuThreads: 8,
      gpuEnabled: true,
      advancedArgs: {},
    });
    mockSaveAppConfig.mockRejectedValue(
      new Error("Binary not found at path: C:\\s2\\s2.exe"),
    );
    mockCheckBinaryExists.mockResolvedValue(true);
    mockCheckFileExists.mockResolvedValue(true);

    render(<AppShell />, { wrapper });

    await completeSetup(user);

    expect(mockSaveAppConfig).toHaveBeenCalled();
    expect(useAppStore.getState().setupComplete).toBe(false);
    expect(
      screen.getByRole("heading", { name: /choose your output folder/i }),
    ).toBeVisible();
  });

  it("saves config via client and updates state", async () => {
    const user = userEvent.setup();
    mockGetAppConfig.mockResolvedValue({
      mode: "simple" as const,
      binaryPath: "",
      modelsPath: "C:\\voice-of-fish\\models",
      outputsPath: "C:\\voice-of-fish\\outputs",
      defaultModelId: "s2-q6",
      defaultAudioFormat: "wav" as const,
      cpuThreads: 8,
      gpuEnabled: true,
      advancedArgs: {},
    });
    mockSaveAppConfig.mockResolvedValue({
      mode: "simple" as const,
      binaryPath: "C:\\s2\\s2.exe",
      modelsPath: "C:\\voice-of-fish\\models",
      outputsPath: "C:\\voice-of-fish\\outputs",
      defaultModelId: "s2-q6",
      defaultAudioFormat: "wav" as const,
      cpuThreads: 8,
      gpuEnabled: true,
      advancedArgs: {},
    });
    mockCheckBinaryExists.mockResolvedValue(true);
    mockCheckFileExists.mockResolvedValue(true);

    render(<AppShell />, { wrapper });

    await completeSetup(user);

    expect(mockSaveAppConfig).toHaveBeenCalled();
    const [firstArg] = mockSaveAppConfig.mock.calls[0];
    expect(firstArg).toMatchObject({ binaryPath: "C:\\s2\\s2.exe" });
  });
  it("returns to setup when persisted binary no longer exists on disk", async () => {
    mockGetAppConfig.mockResolvedValue({
      mode: "simple" as const,
      binaryPath: "C:\\s2\\gone.exe",
      modelsPath: "C:\\voice-of-fish\\models",
      outputsPath: "C:\\voice-of-fish\\outputs",
      defaultModelId: "s2-q6",
      defaultAudioFormat: "wav" as const,
      cpuThreads: 8,
      gpuEnabled: true,
      advancedArgs: {},
    });
    mockCheckBinaryExists.mockResolvedValue(false);
    render(<AppShell />, { wrapper });
    await waitFor(() => {
      expect(mockCheckBinaryExists).toHaveBeenCalledWith("C:\\s2\\gone.exe");
    });
    expect(useAppStore.getState().setupComplete).toBe(false);
    expect(
      await screen.findByRole("heading", { name: /connect s2\.cpp/i }),
    ).toBeVisible();
  });
});
