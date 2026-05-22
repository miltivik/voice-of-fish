const messages = {
  en: {
    appName: "Voice of Fish",
    diagnostics: "Diagnostics",
    generate: "Generate",
    setup: "Voice of Fish Setup",
  },
} as const;

type MessageKey = keyof typeof messages.en;

export function t(key: MessageKey) {
  return messages.en[key];
}
