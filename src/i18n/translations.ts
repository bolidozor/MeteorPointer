export type Locale = 'en' | 'cs';

const en = {
  home: {
    appName: 'METEOR',
    appNameSub: 'POINTER',
    network: 'Bolidozor Network',
    startButton: 'START SESSION',
    startSub: 'Meteor detection',
    lastEvent: (time: string) => `Last event today at ${time}`,
    noEvents: 'No detected events yet',
    tiles: {
      training: 'Training',
      results: 'Results',
      sensors: 'Sensors',
      settings: 'Settings',
      guide: 'How to\nobserve',
    },
  },
  guide: {
    title: 'How to Observe',
    subtitle: 'Recording meteor trajectories with Meteor Pointer',
    sections: {
      about: {
        title: 'About this app',
        paragraphs: [
          'Meteor Pointer records the start and end direction of a meteor trail using your phone\'s orientation sensors. Two aim points form an angular segment that Bolidozor uses to triangulate the meteor\'s path from multiple stations.',
          'Keep your phone face-down nearby during a watch. When a meteor appears, pick it up quickly and aim at the trail.',
        ],
      },
      before: {
        title: 'Before observing',
        items: [
          'Find a dark site with a wide view of the sky, away from city lights.',
          'Give your eyes 10–15 minutes to adapt to darkness. Avoid white light.',
          'The app dims the screen to red automatically — this preserves your night vision.',
          'Place your phone face-down on a steady surface, or keep it in a chest pocket.',
        ],
      },
      during: {
        title: 'When you see a meteor',
        steps: [
          'Note where the meteor appeared (START) and where it faded out (END).',
          'Pick up your phone firmly — the app detects the lift gesture automatically.',
          'Point the top edge of your phone at the START position and hold still.',
          'When you feel or hear a capture cue, swing to the END position and hold still again.',
          'After the second capture the report is saved and queued for sync to Bolidozor.',
        ],
      },
      tips: {
        title: 'Tips',
        items: [
          'Practice the lift-and-aim gesture in Training mode during the day.',
          'Brighter fireballs leave a persistent glowing train — aim at the glow, not the moving point.',
          'If you miss the start point, step back and wait for the next meteor.',
          'The default aiming axis is the top edge of the phone. Adjust in Settings if needed.',
        ],
      },
    },
  },
  settings: {
    language: 'Language',
  },
  account: {
    title: 'Network account',
    tile: 'Network',
    serverUrl: 'API server URL',
    serverPlaceholder: 'https://...',
    consentTitle: 'Consent & data licence',
    loadConsent: 'Load consent document',
    agree: 'I agree and connect',
    agreeRequired: 'Please read and agree to continue.',
    setServerFirst: 'Set the API server URL first.',
    registering: 'Connecting…',
    connected: 'Connected',
    notConnected: 'Not connected',
    deviceId: 'Device ID',
    recoveryTitle: 'Recovery phrase',
    recoveryHint:
      'Write this down. It is the only way to restore your data on a new phone, and it is shown only once.',
    recoverySaved: 'I have saved it',
    pending: (n: number) => `${n} measurement(s) waiting to sync`,
    allSynced: 'All measurements synced',
    syncNow: 'Sync now',
    syncing: 'Syncing…',
    lastError: (e: string) => `Last error: ${e}`,
    deleteData: 'Delete my data',
    deleteDataConfirm:
      'Delete all your measurements from the server? Your device stays registered.',
    disconnect: 'Disconnect & delete account',
    disconnectConfirm:
      'Delete your device identity and all server data? This cannot be undone.',
    delete: 'Delete',
    cancel: 'Cancel',
    webLogin: 'Web sign-in',
    webLoginHint: 'Enter the code shown on the website to sign in there.',
    code: 'Code from the website',
    approve: 'Approve',
    approving: 'Approving…',
    approved: 'Signed in on the web ✓',
  },
};

type T = typeof en;

const cs: T = {
  home: {
    appName: 'METEOR',
    appNameSub: 'POINTER',
    network: 'Bolidozor Network',
    startButton: 'SPUSTIT MĚŘENÍ',
    startSub: 'Detekce meteorů',
    lastEvent: (time: string) => `Poslední událost dnes v ${time}`,
    noEvents: 'Zatím žádná detekovaná událost',
    tiles: {
      training: 'Trénink',
      results: 'Výsledky',
      sensors: 'Senzory',
      settings: 'Nastavení',
      guide: 'Jak\npozorovat',
    },
  },
  guide: {
    title: 'Jak pozorovat',
    subtitle: 'Záznam trajektorie meteorů pomocí Meteor Pointer',
    sections: {
      about: {
        title: 'O aplikaci',
        paragraphs: [
          'Meteor Pointer zaznamenává počáteční a koncový směr meteorické stopy pomocí orientačních senzorů telefonu. Dva zaměřovací body tvoří úhlový úsek, který Bolidozor využívá k triangulaci dráhy meteoritu z více stanic.',
          'Nech telefon displejem dolů poblíž sebe během pozorování. Když se objeví meteor, rychle ho zvedni a zamiř na stopu.',
        ],
      },
      before: {
        title: 'Před pozorováním',
        items: [
          'Najdi temné místo s širokým výhledem na oblohu, daleko od světelného znečistění.',
          'Dej si 10–15 minut na adaptaci očí na tmu. Vyhni se bílému světlu.',
          'Aplikace automaticky ztlumí displej na červenou — to chrání tvé noční vidění.',
          'Polož telefon displejem dolů na pevnou podložku, nebo ho schovej do náprsní kapsy.',
        ],
      },
      during: {
        title: 'Když uvidíš meteor',
        steps: [
          'Zapamatuj si, kde se meteor objevil (ZAČÁTEK) a kde zhasl (KONEC).',
          'Pevně zvedni telefon — aplikace automaticky detekuje gesto zdvihnutí.',
          'Namiř horní hranu telefonu na ZAČÁTEK stopy a drž klidně.',
          'Když pocítíš nebo uslyšíš signál záchytu, přesuň se na KONEC stopy a opět drž klidně.',
          'Po druhém záchytu se záznam uloží a zařadí do fronty synchronizace s Bolidozorem.',
        ],
      },
      tips: {
        title: 'Tipy',
        items: [
          'Procvič gesto zvednutí a míření v Tréninkovém režimu přes den.',
          'Jasnější bolidy zanechávají přetrvávající svítící stopu — míř na záři, ne na pohybující se bod.',
          'Pokud nestihneš počáteční bod, vrať se a počkej na další meteor.',
          'Výchozí zaměřovací osou je horní hrana telefonu. V případě potřeby uprav v Nastavení.',
        ],
      },
    },
  },
  settings: {
    language: 'Jazyk',
  },
  account: {
    title: 'Síťový účet',
    tile: 'Síť',
    serverUrl: 'Adresa API serveru',
    serverPlaceholder: 'https://...',
    consentTitle: 'Souhlas a licence dat',
    loadConsent: 'Načíst text souhlasu',
    agree: 'Souhlasím a připojit',
    agreeRequired: 'Pro pokračování si prosím přečti a odsouhlas podmínky.',
    setServerFirst: 'Nejdřív nastav adresu API serveru.',
    registering: 'Připojuji…',
    connected: 'Připojeno',
    notConnected: 'Nepřipojeno',
    deviceId: 'ID zařízení',
    recoveryTitle: 'Obnovovací fráze',
    recoveryHint:
      'Zapiš si ji. Je to jediný způsob, jak obnovit svá data na novém telefonu, a zobrazí se jen jednou.',
    recoverySaved: 'Uložil(a) jsem si ji',
    pending: (n: number) => `Čeká na synchronizaci: ${n} měření`,
    allSynced: 'Všechna měření synchronizována',
    syncNow: 'Synchronizovat',
    syncing: 'Synchronizuji…',
    lastError: (e: string) => `Poslední chyba: ${e}`,
    deleteData: 'Smazat moje data',
    deleteDataConfirm:
      'Smazat všechna tvá měření ze serveru? Zařízení zůstane zaregistrované.',
    disconnect: 'Odpojit a smazat účet',
    disconnectConfirm:
      'Smazat identitu zařízení a všechna data na serveru? Tuto akci nelze vrátit.',
    delete: 'Smazat',
    cancel: 'Zrušit',
    webLogin: 'Přihlásit web',
    webLoginHint: 'Zadej kód zobrazený na webu a přihlas se tam.',
    code: 'Kód z webu',
    approve: 'Schválit',
    approving: 'Schvaluji…',
    approved: 'Web přihlášen ✓',
  },
};

export const translations: Record<Locale, T> = { en, cs };
