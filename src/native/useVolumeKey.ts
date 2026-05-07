import { useEffect, useRef } from 'react';
import { NativeEventEmitter, NativeModules } from 'react-native';

const mod = NativeModules.VolumeKeyModule as
  | { setActive: (v: boolean) => void; addListener: (e: string) => void; removeListeners: (n: number) => void }
  | undefined;

const emitter = mod ? new NativeEventEmitter(mod as never) : null;

export function useVolumeKey(
  onPress: (key: 'up' | 'down') => void,
  active: boolean,
): void {
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  useEffect(() => {
    if (!mod || !emitter || !active) {
      mod?.setActive(false);
      return;
    }

    mod.setActive(true);
    const sub = emitter.addListener('VolumeKeyPress', (e: { key: string }) => {
      onPressRef.current(e.key as 'up' | 'down');
    });

    return () => {
      sub.remove();
      mod.setActive(false);
    };
  }, [active]);
}
