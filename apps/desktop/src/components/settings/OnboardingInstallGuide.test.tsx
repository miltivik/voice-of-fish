import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, vi } from "vitest";
import { OnboardingInstallGuide } from "./OnboardingInstallGuide";

const mockOpenExternalLink = vi.fn();
const mockCopyToClipboard = vi.fn();

vi.mock("@/lib/tauri", () => ({
  openExternalLink: (...args: unknown[]) => mockOpenExternalLink(...args),
}));

vi.mock("@/lib/clipboard", () => ({
  copyToClipboard: (...args: unknown[]) => mockCopyToClipboard(...args),
}));

describe("OnboardingInstallGuide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCopyToClipboard.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts collapsed with Spanish quick-guide trigger", () => {
    render(<OnboardingInstallGuide />);

    const details = screen
      .getByText(/Necesitas instalar s2\.cpp/i)
      .closest("details");
    expect(details).not.toHaveAttribute("open");
  });

  it("opens quick guide and switches to English", async () => {
    const user = userEvent.setup();
    render(<OnboardingInstallGuide />);

    await user.click(screen.getByText(/Necesitas instalar s2\.cpp/i));
    expect(screen.getByText(/Voice of Fish no instala s2\.cpp/i)).toBeVisible();
    expect(screen.getByText("Windows PowerShell")).toBeVisible();
    expect(screen.getByText("Linux shell")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "English" }));
    expect(
      screen.getByText(/Voice of Fish does not install s2\.cpp/i),
    ).toBeVisible();
  });

  it("shows copy button in each command block", async () => {
    const user = userEvent.setup();
    render(<OnboardingInstallGuide />);

    await user.click(screen.getByText(/Necesitas instalar s2\.cpp/i));

    const copyButtons = screen.getAllByRole("button", { name: "Copiar" });
    expect(copyButtons).toHaveLength(2);
  });

  it("copies Windows commands and shows copied feedback", async () => {
    const user = userEvent.setup();
    render(<OnboardingInstallGuide />);

    await user.click(screen.getByText(/Necesitas instalar s2\.cpp/i));

    const copyButtons = screen.getAllByRole("button", { name: "Copiar" });
    await user.click(copyButtons[0]);

    expect(mockCopyToClipboard).toHaveBeenCalledWith(
      expect.stringContaining("git clone --recurse-submodules"),
    );
    expect(screen.getByRole("button", { name: "¡Copiado!" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Copiar" }),
    ).toBeInTheDocument();
  });

  it("opens full local guide and returns to setup help", async () => {
    const user = userEvent.setup();
    render(<OnboardingInstallGuide />);

    await user.click(screen.getByText(/Necesitas instalar s2\.cpp/i));
    await user.click(
      screen.getByRole("button", { name: /Abrir guía completa/i }),
    );

    expect(
      screen.getByRole("heading", { name: /Guía completa de instalación/i }),
    ).toBeVisible();
    expect(screen.getByText(/build\\Release\\s2\.exe/i)).toBeVisible();
    expect(screen.getByText(/chmod \+x build\/s2/i)).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: /Volver a configuración/i }),
    );
    expect(screen.getByText(/Necesitas instalar s2\.cpp/i)).toBeVisible();
  });

  it("opens only fixed repository actions", async () => {
    const user = userEvent.setup();
    render(<OnboardingInstallGuide />);

    await user.click(screen.getByText(/Necesitas instalar s2\.cpp/i));
    await user.click(
      screen.getByRole("button", { name: /Abrir repositorio s2\.cpp/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /Abrir modelos GGUF/i }),
    );

    expect(mockOpenExternalLink).toHaveBeenNthCalledWith(1, "engineSource");
    expect(mockOpenExternalLink).toHaveBeenNthCalledWith(2, "ggufSource");
  });
});
