import axios from 'axios';

const STORAGE_KEYS = {
  accessToken: 'token',
  legacyAccessToken: 'careplus_access_token',
  refreshToken: 'careplus_refresh_token',
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
  timeout: 30000,
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

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;
    const requestUrl = String(originalRequest?.url || '');
    const isAuthRequest = requestUrl.includes('/auth/');

    if (status === 401 && !isAuthRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return http(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}${withApiPrefix('/auth/refresh')}`, {
            refresh_token: refreshToken,
          });
          const authData = data?.data?.access_token ? data.data : data;

          persistSession({
            accessToken: authData.access_token,
            refreshToken: authData.refresh_token,
            user: authData.user,
          });

          isRefreshing = false;
          processQueue(null, authData.access_token);

          originalRequest.headers['Authorization'] = 'Bearer ' + authData.access_token;
          return http(originalRequest);
        } catch (refreshError) {
          isRefreshing = false;
          processQueue(refreshError, null);
          clearStoredSession();
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.assign('/login');
          }
          return Promise.reject(refreshError);
        }
      } else {
        clearStoredSession();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
      }
    }

    return Promise.reject(error);
  }
);

function persistSession({ accessToken, refreshToken, user }) {
  if (!isValidToken(accessToken)) {
    return;
  }

  localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
  localStorage.setItem(STORAGE_KEYS.legacyAccessToken, accessToken);

  if (refreshToken) {
    localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
  }

  if (user) {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  }
}

function getAuthData(responseData) {
  return responseData?.data?.access_token ? responseData.data : responseData;
}

export function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.legacyAccessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
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
  const authData = getAuthData(data);
  const session = {
    accessToken: authData.access_token,
    refreshToken: authData.refresh_token || null,
    user: authData.user || null,
  };
  persistSession(session);
  return session;
}

export async function googleLogin(payload) {
  const { data } = await http.post(withApiPrefix('/auth/google'), payload);
  const authData = getAuthData(data);
  const session = {
    accessToken: authData.access_token,
    refreshToken: authData.refresh_token || null,
    user: authData.user || null,
  };
  persistSession(session);
  return session;
}

export async function forgotPassword(email) {
  const { data } = await http.post(withApiPrefix('/auth/forgot-password'), { email });
  return data;
}

export async function resetPassword(payload) {
  const { data } = await http.post(withApiPrefix('/auth/reset-password'), payload);
  return data;
}

export async function verifyEmail(payload) {
  const { data } = await http.post(withApiPrefix('/auth/verify-email'), payload);
  return data;
}

export async function resendVerification(email) {
  const { data } = await http.post(withApiPrefix('/auth/resend-verification'), { email });
  return data;
}

export async function setPassword(payload) {
  const { data } = await http.post(withApiPrefix('/auth/set-password'), payload);
  return data;
}

export async function changePassword(payload) {
  const { data } = await http.post(withApiPrefix('/auth/change-password'), payload);
  return data;
}

export async function getChatHistory() {
  const { data } = await http.get('/api/chat/history');
  return data;
}

export async function getCurrentUser() {
  const { data } = await http.get(withApiPrefix('/auth/me'));
  return data?.data || data;
}

export async function logoutUser() {
  try {
    await http.post(withApiPrefix('/auth/logout'));
  } catch {
    // Local logout should still complete if the token is already invalid or the API is unavailable.
  } finally {
    clearStoredSession();
  }
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

export async function updateHealthProfile(payload) {
  const { data } = await http.put(withApiPrefix('/user/health-profile'), payload);
  return data;
}

export async function analyzeSymptoms(payload) {
  const { data } = await http.post(withApiPrefix('/nlp/analyze-symptoms'), payload);
  return data;
}

export async function sendChatMessage(payload) {
  const { data } = await http.post('/api/chat', payload);
  return data;
}

export async function getHospitals(filters = {}) {
  const { data } = await http.get(withApiPrefix('/hospitals'), { params: filters });
  return data?.data || data;
}

export async function getSpecialties() {
  const { data } = await http.get(withApiPrefix('/hospitals/specialties'));
  return data?.data || data;
}

export async function getAppointments() {
  const { data } = await http.get(withApiPrefix('/appointments'));
  return data?.data || data;
}

export async function bookAppointment(payload) {
  const { data } = await http.post(withApiPrefix('/appointments'), payload);
  return data?.data || data;
}

export async function cancelAppointment(appointmentId) {
  const { data } = await http.patch(withApiPrefix(`/appointments/${appointmentId}/cancel`));
  return data?.data || data;
}

export async function rescheduleAppointment(appointmentId, payload) {
  const { data } = await http.patch(withApiPrefix(`/appointments/${appointmentId}/reschedule`), payload);
  return data?.data || data;
}

export async function getBookedSlots(doctorId, date) {
  const { data } = await http.get(withApiPrefix('/appointments/booked-slots'), {
    params: { doctor_id: doctorId, appointment_date: date }
  });
  return data?.booked_slots || [];
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
