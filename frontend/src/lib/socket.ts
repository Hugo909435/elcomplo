import { io, Socket } from 'socket.io-client';

/**
 * URL du serveur : VITE_SERVER_URL si defini (deploiement), sinon le meme
 * hote que la page sur le port 3001 (dev local + telephone sur le meme
 * reseau local via l'IP de la machine).
 */
export function serverUrl(): string {
  const fromEnv = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (fromEnv) return fromEnv;
  return `${window.location.protocol}//${window.location.hostname}:3001`;
}

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(serverUrl(), { transports: ['websocket'], autoConnect: true });
  }
  return socket;
}

export interface Ack<T = unknown> {
  ok: boolean;
  token?: string;
  snapshot?: T;
  error?: { code: string; message: string };
}

/** Emission avec accuse de reception et timeout — jamais de promesse pendante infinie. */
export function emitAck<T = unknown>(event: string, body?: unknown, timeoutMs = 8000): Promise<Ack<T>> {
  return new Promise((resolve) => {
    const s = getSocket();
    const timer = setTimeout(
      () => resolve({ ok: false, error: { code: 'TIMEOUT', message: 'Le serveur ne repond pas' } }),
      timeoutMs,
    );
    s.emit(event, body ?? {}, (response: Ack<T>) => {
      clearTimeout(timer);
      resolve(response ?? { ok: false, error: { code: 'NO_ACK', message: 'Reponse invalide du serveur' } });
    });
  });
}

const SESSION_KEY = 'leconseil.session.token';

export function saveSessionToken(token: string): void {
  try {
    localStorage.setItem(SESSION_KEY, token);
  } catch {
    /* stockage indisponible (navigation privee) : la reconnexion ne survivra pas au refresh */
  }
}

export function loadSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function clearSessionToken(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
