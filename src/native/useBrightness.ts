// TODO: Bridge to native screen brightness API
// TODO: Restore original brightness on unmount

export function useBrightness(): { setBrightness: (value: number) => void } {
  const setBrightness = (_value: number): void => {
    // TODO: call native brightness module
  };

  return { setBrightness };
}
