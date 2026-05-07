import { NativeModules } from 'react-native';

const mod = NativeModules.SpeechInputModule as
  | { startListening: (prompt: string) => Promise<string> }
  | undefined;

export async function startSpeechInput(prompt = 'Speak now'): Promise<string | null> {
  if (!mod) return null;
  try {
    const result = await mod.startListening(prompt);
    return result || null;
  } catch {
    return null;
  }
}
