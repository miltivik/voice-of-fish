import type { BuiltInVoice } from "./types";

/**
 * Built-in voice definitions for first-run seeding.
 *
 * Each voice has a reference audio clip from the MiniMaxAI/TTS-Multilingual-Test-Set
 * dataset on Hugging Face (Apache 2.0 license). The app downloads these on first
 * launch and registers them as VoicePresets so users can pick a voice immediately
 * without cloning.
 *
 * Sources:
 *   https://huggingface.co/datasets/MiniMaxAI/TTS-Multilingual-Test-Set
 */
export const BUILT_IN_VOICES: BuiltInVoice[] = [
  // ── English ──────────────────────────────────────────────
  {
    id: "built-in-en-female-1",
    name: "Alice",
    gender: "female",
    language: "en",
    referenceText: "Hello, this is a sample voice for text to speech synthesis.",
    referenceAudioUrl:
      "https://huggingface.co/datasets/MiniMaxAI/TTS-Multilingual-Test-Set/resolve/main/speaker/english/english_female/common_voice_en_42357710.mp3",
    referenceFileName: "en_female_alice.mp3",
    durationSeconds: 12,
  },
  {
    id: "built-in-en-male-1",
    name: "Daniel",
    gender: "male",
    language: "en",
    referenceText: "Hello, this is a sample voice for text to speech synthesis.",
    referenceAudioUrl:
      "https://huggingface.co/datasets/MiniMaxAI/TTS-Multilingual-Test-Set/resolve/main/speaker/english/english_male/common_voice_en_42238763.mp3",
    referenceFileName: "en_male_daniel.mp3",
    durationSeconds: 12,
  },
  // ── Spanish ──────────────────────────────────────────────
  {
    id: "built-in-es-female-1",
    name: "Carmen",
    gender: "female",
    language: "es",
    referenceText:
      "Hola, esta es una voz de muestra para síntesis de texto a voz.",
    referenceAudioUrl:
      "https://huggingface.co/datasets/MiniMaxAI/TTS-Multilingual-Test-Set/resolve/main/speaker/spanish/spanish_female/common_voice_es_42626286.mp3",
    referenceFileName: "es_female_carmen.mp3",
    durationSeconds: 12,
  },
  {
    id: "built-in-es-male-1",
    name: "Diego",
    gender: "male",
    language: "es",
    referenceText:
      "Hola, esta es una voz de muestra para síntesis de texto a voz.",
    referenceAudioUrl:
      "https://huggingface.co/datasets/MiniMaxAI/TTS-Multilingual-Test-Set/resolve/main/speaker/spanish/spanish_male/common_voice_es_42009030.mp3",
    referenceFileName: "es_male_diego.mp3",
    durationSeconds: 12,
  },
  // ── Japanese ─────────────────────────────────────────────
  {
    id: "built-in-ja-female-1",
    name: "Sakura",
    gender: "female",
    language: "ja",
    referenceText:
      "こんにちは、これはテキストから音声への合成のためのサンプル音声です。",
    referenceAudioUrl:
      "https://huggingface.co/datasets/MiniMaxAI/TTS-Multilingual-Test-Set/resolve/main/speaker/japanese/japanese_female/common_voice_ja_40928196.mp3",
    referenceFileName: "ja_female_sakura.mp3",
    durationSeconds: 12,
  },
  {
    id: "built-in-ja-male-1",
    name: "Haruto",
    gender: "male",
    language: "ja",
    referenceText:
      "こんにちは、これはテキストから音声への合成のためのサンプル音声です。",
    referenceAudioUrl:
      "https://huggingface.co/datasets/MiniMaxAI/TTS-Multilingual-Test-Set/resolve/main/speaker/japanese/japanese_male/common_voice_ja_40899872.mp3",
    referenceFileName: "ja_male_haruto.mp3",
    durationSeconds: 12,
  },
];
