import { Injectable, InjectionToken, inject } from '@angular/core';
import type { KoraData } from './models';

export const STORAGE_KEY = 'kora:data:v1';
export const CORRUPT_BACKUP_KEY = 'kora:data:corrupt';

export type LoadResult =
  | { status: 'ok'; data: KoraData }
  | { status: 'empty' }
  | { status: 'corrupt'; message: string }
  | { status: 'unavailable'; message: string };

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'quota' | 'unavailable' | 'unknown'; message: string };

/**
 * Interface de dépôt : isole le stockage local pour pouvoir brancher une API
 * plus tard sans modifier les écrans ni les règles métier.
 */
export interface KoraRepository {
  load(): LoadResult;
  save(data: KoraData): SaveResult;
  clear(): void;
}

function isKoraData(value: unknown): value is KoraData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<KoraData>;
  return (
    typeof candidate.schemaVersion === 'number' &&
    !!candidate.shop &&
    typeof candidate.shop.name === 'string' &&
    Array.isArray(candidate.products) &&
    Array.isArray(candidate.sales) &&
    Array.isArray(candidate.expenses) &&
    Array.isArray(candidate.movements)
  );
}

function getStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = '__kora_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class LocalStorageRepository implements KoraRepository {
  load(): LoadResult {
    const storage = getStorage();
    if (!storage) {
      return {
        status: 'unavailable',
        message:
          'Le stockage local est indisponible dans ce navigateur. Les modifications ne seront pas conservées après rechargement.',
      };
    }

    let raw: string | null;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch {
      return { status: 'unavailable', message: 'Impossible de lire les données locales.' };
    }

    if (!raw) return { status: 'empty' };

    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isKoraData(parsed)) {
        storage.setItem(CORRUPT_BACKUP_KEY, raw);
        return {
          status: 'corrupt',
          message:
            'Les données enregistrées sur cet appareil étaient illisibles. Une sauvegarde a été conservée et les données de démonstration ont été rechargées.',
        };
      }
      if (parsed.schemaVersion > 1) {
        storage.setItem(CORRUPT_BACKUP_KEY, raw);
        return {
          status: 'corrupt',
          message:
            'Ces données viennent d’une version plus récente de Kora. Les données de démonstration ont été rechargées.',
        };
      }
      return { status: 'ok', data: parsed };
    } catch {
      try {
        storage.setItem(CORRUPT_BACKUP_KEY, raw);
      } catch {
        /* le stockage peut être plein : on continue sans bloquer l'app */
      }
      return {
        status: 'corrupt',
        message:
          'Les données enregistrées sur cet appareil étaient corrompues. Les données de démonstration ont été rechargées.',
      };
    }
  }

  save(data: KoraData): SaveResult {
    const storage = getStorage();
    if (!storage) {
      return {
        ok: false,
        reason: 'unavailable',
        message:
          'Stockage local indisponible : la modification n’a pas été enregistrée sur cet appareil.',
      };
    }
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(data));
      return { ok: true };
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        return {
          ok: false,
          reason: 'quota',
          message:
            'Espace de stockage plein. Exportez vos données puis réinitialisez la démonstration pour libérer de la place.',
        };
      }
      return {
        ok: false,
        reason: 'unknown',
        message: 'Impossible d’enregistrer les données sur cet appareil.',
      };
    }
  }

  clear(): void {
    const storage = getStorage();
    storage?.removeItem(STORAGE_KEY);
  }
}

export const KORA_REPOSITORY = new InjectionToken<KoraRepository>('KORA_REPOSITORY', {
  providedIn: 'root',
  factory: () => inject(LocalStorageRepository),
});
