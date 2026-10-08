import { useEffect, useState } from 'react';
import { getInstallState, isIos, promptInstall, subscribeInstall } from '../lib/pwa';

export function useInstallPrompt() {
  const [state, setState] = useState(getInstallState);

  useEffect(() => subscribeInstall(() => setState(getInstallState())), []);

  return { ...state, ios: isIos(), install: promptInstall };
}
