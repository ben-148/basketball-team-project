const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const STORAGE_KEY = 'bb_admin_auth';

export function login(username, password) {
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    sessionStorage.setItem(STORAGE_KEY, 'true');
    return true;
  }
  return false;
}

export function logout() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function isAuthenticated() {
  return sessionStorage.getItem(STORAGE_KEY) === 'true';
}
