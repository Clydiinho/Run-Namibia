import { createClient } from '@supabase/supabase-js';

/**
 * Cleans the Supabase URL in case the user configured the REST endpoint
 * (e.g. https://xyz.supabase.co/rest/v1/) instead of the base project URL.
 */
export function cleanSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    return url.replace(/\/rest\/v1\/?$/i, '').replace(/\/auth\/v1\/?$/i, '').replace(/\/+$/, '');
  }
}

// Read from Vite environment variables (never hardcoded)
const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseUrl = cleanSupabaseUrl(rawSupabaseUrl);
const supabaseAnonKey = rawAnonKey.trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key'
);

// Fallback dummy client if credentials aren't provided yet so app does not crash
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export interface PlayerProfile {
  id: string;
  nickname: string;
  phone?: string;
  best_score: number;
  created_at?: string;
  updated_at?: string;
}

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  best_score: number;
  rank: number;
}

export interface ScoreSubmissionResult {
  is_new_best: boolean;
  best_score: number;
  rank: number;
}

export interface AuthResult {
  user: any;
  error?: string;
  status?: number;
  rawError?: any;
}

/**
 * Derives the hidden background email needed by Supabase Auth from the user's nickname.
 * Never exposed to the player.
 */
export function nicknameToEmail(nickname: string): string {
  return `${nickname.trim().toLowerCase()}@players.runnamibia.app`;
}

/**
 * Validates nickname: 3-15 characters, letters, numbers, and underscore only, no spaces.
 */
export function isValidNickname(nickname: string): boolean {
  return /^[a-zA-Z0-9_]{3,15}$/.test(nickname.trim());
}

/**
 * Validates optional mobile number: digits, spaces, and optional leading +
 */
export function isValidPhone(phone: string): boolean {
  const trimmed = phone.trim();
  if (!trimmed) return true;
  return /^\+?[0-9\s]{4,20}$/.test(trimmed);
}

/**
 * Checks if a nickname is already taken by another player
 */
export async function checkNicknameAvailable(nickname: string): Promise<{ available: boolean; error?: string }> {
  const trimmed = nickname.trim();
  if (!isValidNickname(trimmed)) {
    return { available: false, error: 'Nickname must be 3–15 characters (letters, numbers, underscore only).' };
  }

  if (!isSupabaseConfigured) {
    const demoTaken = ['kalahariking', 'dunesprinter', 'oryxrunner', 'safarispeed', 'namibghost'];
    if (demoTaken.includes(trimmed.toLowerCase())) {
      return { available: false, error: 'That nickname is taken, try another.' };
    }
    return { available: true };
  }

  const { data, error } = await supabase
    .from('players')
    .select('id')
    .ilike('nickname', trimmed)
    .maybeSingle();

  if (error) {
    return { available: false, error: error.message };
  }

  return { available: !data, error: data ? 'That nickname is taken, try another.' : undefined };
}

/**
 * Signs up a new player using their nickname, password, and optional mobile number.
 * Uses hidden email generated from nickname under the hood.
 */
export async function signUpPlayer(
  nickname: string,
  pass: string,
  phone?: string
): Promise<AuthResult> {
  const trimmedNick = nickname.trim();
  if (!isValidNickname(trimmedNick)) {
    return { user: null, error: 'Nickname must be 3–15 characters (letters, numbers and underscore only, no spaces).' };
  }

  if (!pass || pass.length < 6) {
    return { user: null, error: 'Password must be at least 6 characters.' };
  }

  const cleanPhone = phone?.trim() ? phone.trim() : undefined;
  if (cleanPhone && !isValidPhone(cleanPhone)) {
    return { user: null, error: 'Please enter a valid mobile number (digits, spaces, leading +) or leave it blank.' };
  }

  const email = nicknameToEmail(trimmedNick);

  if (!isSupabaseConfigured) {
    const demoUser = {
      id: 'demo-local-runner',
      email,
      user_metadata: { nickname: trimmedNick, phone: cleanPhone },
    };
    const demoProfile: PlayerProfile = {
      id: 'demo-local-runner',
      nickname: trimmedNick,
      phone: cleanPhone,
      best_score: 0,
    };
    localStorage.setItem('run_namibia_demo_player', JSON.stringify(demoProfile));
    return { user: demoUser };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
    options: {
      data: {
        nickname: trimmedNick,
        ...(cleanPhone ? { phone: cleanPhone } : {}),
      },
    },
  });

  if (error) {
    console.error('Supabase signUp error object:', error);
    console.error(error);

    const errorMsg = error.message || '';
    const isAlreadyRegistered = errorMsg.toLowerCase().includes('already registered');

    if (isAlreadyRegistered) {
      return {
        user: null,
        error: 'That nickname is taken, try another.',
        status: (error as any).status,
        rawError: error,
      };
    }

    return {
      user: null,
      error: error.message,
      status: (error as any).status,
      rawError: error,
    };
  }

  // If signUp succeeded, ensure player has an active session immediately
  if (!data.session) {
    const signInRes = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (signInRes.error) {
      console.error('Supabase auto-login after signup error object:', signInRes.error);
      console.error(signInRes.error);
    }
    if (signInRes.data?.user) {
      return { user: signInRes.data.user };
    }
  }

  return { user: data.user };
}

/**
 * Logs in an existing player using their nickname and password.
 */
export async function signInPlayer(
  nickname: string,
  pass: string
): Promise<AuthResult> {
  const trimmedNick = nickname.trim();
  if (!trimmedNick) {
    return { user: null, error: 'Please enter your nickname.' };
  }
  if (!pass) {
    return { user: null, error: 'Please enter your password.' };
  }

  const email = nicknameToEmail(trimmedNick);

  if (!isSupabaseConfigured) {
    const saved = localStorage.getItem('run_namibia_demo_player');
    const existing: PlayerProfile | null = saved ? JSON.parse(saved) : null;
    const nick = existing?.nickname || trimmedNick;
    const profile: PlayerProfile = {
      id: 'demo-local-runner',
      nickname: nick,
      best_score: existing?.best_score || 0,
    };
    localStorage.setItem('run_namibia_demo_player', JSON.stringify(profile));
    return {
      user: {
        id: 'demo-local-runner',
        email,
        user_metadata: { nickname: nick },
      },
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (error) {
    console.error('Supabase signIn error object:', error);
    console.error(error);
    return {
      user: null,
      error: 'Wrong nickname or password.',
      status: (error as any).status,
      rawError: error,
    };
  }

  return { user: data.user };
}

/**
 * Signs out the current player
 */
export async function signOutPlayer(): Promise<void> {
  if (isSupabaseConfigured) {
    await supabase.auth.signOut();
  }
  localStorage.removeItem('run_namibia_demo_player');
}

/**
 * Fetches the logged-in player's profile from the 'players' table
 */
export async function fetchCurrentPlayerProfile(): Promise<PlayerProfile | null> {
  const savedLocal = localStorage.getItem('run_namibia_demo_player');
  let localProfile: PlayerProfile | null = null;
  if (savedLocal) {
    try {
      localProfile = JSON.parse(savedLocal);
    } catch {}
  }

  if (!isSupabaseConfigured) {
    return localProfile;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return localProfile;
    }

    const { data, error } = await supabase
      .from('players')
      .select('id, nickname, best_score, created_at, updated_at')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data) {
      // If table doesn't exist or trigger had a momentary delay, fallback to user metadata
      return {
        id: user.id,
        nickname: user.user_metadata?.nickname || localProfile?.nickname || 'Runner',
        best_score: localProfile?.best_score || 0,
      };
    }

    return data as PlayerProfile;
  } catch {
    return localProfile;
  }
}

/**
 * Submits a run score to Supabase via the submit_score RPC
 */
export async function submitScoreToSupabase(score: number): Promise<ScoreSubmissionResult | null> {
  const intScore = Math.max(0, Math.floor(score));

  const updateLocalScore = (): ScoreSubmissionResult => {
    const saved = localStorage.getItem('run_namibia_demo_player');
    let currentBest = 0;
    let currentNick = 'Runner';
    if (saved) {
      try {
        const p = JSON.parse(saved);
        currentBest = p.best_score || 0;
        currentNick = p.nickname || 'Runner';
      } catch {}
    }
    const isNewBest = intScore > currentBest;
    const newBest = isNewBest ? intScore : currentBest;
    localStorage.setItem(
      'run_namibia_demo_player',
      JSON.stringify({ id: 'local-runner', nickname: currentNick, best_score: newBest })
    );
    const demoScores = [18450, 14200, 11980, 9400, 7200];
    const rank = demoScores.filter((s) => s > newBest).length + 1;
    return {
      is_new_best: isNewBest,
      best_score: newBest,
      rank,
    };
  };

  if (!isSupabaseConfigured) {
    return updateLocalScore();
  }

  try {
    const { data, error } = await supabase.rpc('submit_score', {
      new_score: intScore,
    });

    if (error) {
      console.warn('Supabase submit_score RPC error, recording score locally:', error.message);
      return updateLocalScore();
    }

    return data as ScoreSubmissionResult;
  } catch (err) {
    console.warn('Supabase submit_score exception, recording score locally:', err);
    return updateLocalScore();
  }
}

/**
 * Fetches top 20 players for the public leaderboard
 */
export async function fetchLeaderboard(limit: number = 20): Promise<{ entries: LeaderboardEntry[]; error?: string }> {
  const fallbackEntries: LeaderboardEntry[] = [
    { id: 'demo-1', nickname: 'KalahariKing', best_score: 18450, rank: 1 },
    { id: 'demo-2', nickname: 'DuneSprinter', best_score: 14200, rank: 2 },
    { id: 'demo-3', nickname: 'OryxRunner', best_score: 11980, rank: 3 },
    { id: 'demo-4', nickname: 'SafariSpeed', best_score: 9400, rank: 4 },
    { id: 'demo-5', nickname: 'NamibGhost', best_score: 7200, rank: 5 },
  ];

  if (!isSupabaseConfigured) {
    return { entries: fallbackEntries };
  }

  try {
    const { data, error } = await supabase
      .from('players')
      .select('id, nickname, best_score')
      .order('best_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Supabase players table not ready yet, using leaderboard fallback:', error.message);
      return { entries: fallbackEntries, error: error.message };
    }

    const entries: LeaderboardEntry[] = (data || []).map((row, index) => ({
      id: row.id,
      nickname: row.nickname,
      best_score: row.best_score,
      rank: index + 1,
    }));

    return { entries: entries.length > 0 ? entries : fallbackEntries };
  } catch (err: any) {
    console.warn('Leaderboard fetch exception:', err);
    return { entries: fallbackEntries, error: err?.message };
  }
}

/**
 * Fetches the specific rank of the currently logged-in player
 */
export async function fetchUserRank(userId: string, userBestScore: number): Promise<number | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const { count, error } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .gt('best_score', userBestScore);

  if (error || count === null) {
    return null;
  }

  return count + 1;
}
