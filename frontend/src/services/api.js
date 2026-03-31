import axios from 'axios';

const STORAGE_KEYS = {
  accessToken: 'token',
  legacyAccessToken: 'careplus_access_token',
  user: 'careplus_user',
};

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
const API_PREFIX = process.env.REACT_APP_API_PREFIX || '/api/v1';
const BASE_HAS_PREFIX = API_BASE_URL.replace(/\/+$/, '').endsWith(API_PREFIX);

const http = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

function withApiPrefix(path) {
  return BASE_HAS_PREFIX ? path : `${API_PREFIX}${path}`;
}

function isValidToken(token) {
  if (!token) {
    return false;
  }

  const normalized = String(token).trim().toLowerCase();
  return normalized !== '' && normalized !== 'undefined' && normalized !== 'null';
}

http.interceptors.request.use((config) => {
  const token =
    localStorage.getItem(STORAGE_KEYS.accessToken) ||
    localStorage.getItem(STORAGE_KEYS.legacyAccessToken);

  if (isValidToken(token)) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }

  return config;
});

function persistSession({ accessToken, user }) {
  if (!isValidToken(accessToken)) {
    return;
  }

  localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
  localStorage.setItem(STORAGE_KEYS.legacyAccessToken, accessToken);

  if (user) {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  }
}

export function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.legacyAccessToken);
  localStorage.removeItem(STORAGE_KEYS.user);
}

export function getStoredSession() {
  const accessToken =
    localStorage.getItem(STORAGE_KEYS.accessToken) ||
    localStorage.getItem(STORAGE_KEYS.legacyAccessToken);
  const userRaw = localStorage.getItem(STORAGE_KEYS.user);

  if (!isValidToken(accessToken)) {
    clearStoredSession();
    return null;
  }

  let user = null;
  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
    } catch {
      user = null;
    }
  }

  return {
    accessToken,
    user,
  };
}

export async function registerUser(payload) {
  const body = {
    name: payload?.name?.trim() || '',
    email: payload?.email?.trim()?.toLowerCase() || '',
    password: payload?.password || '',
  };

  if (payload?.username) {
    body.username = payload.username.trim();
  }

  const confirmPassword = payload?.confirm_password || payload?.confirmPassword;
  if (confirmPassword) {
    body.confirm_password = confirmPassword;
  }

  const { data } = await http.post(withApiPrefix('/auth/register'), body);
  return data;
}

export async function loginUser(payload) {
  const body = {
    password: payload?.password || '',
  };

  if (payload?.email) {
    body.email = payload.email.trim().toLowerCase();
  } else if (payload?.identifier) {
    body.identifier = payload.identifier.trim();
  }

  const { data } = await http.post(withApiPrefix('/auth/login'), body);
  const session = {
    accessToken: data.access_token,
    user: data.user || null,
  };
  persistSession(session);
  return session;
}

export async function googleLogin(payload) {
  const { data } = await http.post(withApiPrefix('/auth/google'), payload);
  const session = {
    accessToken: data.access_token,
    user: data.user || null,
  };
  persistSession(session);
  return session;
}

export async function getHealthProfile() {
  try {
    const { data } = await http.get(withApiPrefix('/user/health-profile'));
    return data;
  } catch (error) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function saveHealthProfile(payload) {
  const { data } = await http.post(withApiPrefix('/user/health-profile'), payload);
  return data;
}

export function getApiErrorMessage(error, fallbackMessage = 'Something went wrong.') {
  const data = error?.response?.data;
  const detail = data?.detail;

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }

  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === 'string') {
      return first;
    }
    if (first?.msg) {
      return first.msg;
    }
  }

  if (detail?.message) {
    return detail.message;
  }

  return fallbackMessage;
}

export default http;
