import axios from 'axios';

const TOKEN_KEY = 'inventory_token';

const configuredUrl = import.meta.env.VITE_API_URL?.trim();
const baseURL = (configuredUrl && configuredUrl.length > 0
    ? configuredUrl
    : 'http://api-inventory.vaglogic.com/api/v1'
).replace(/\/+$/, '');

export const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

export function getAuthToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        return;
    }

    localStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common.Authorization;
}

const existingToken = getAuthToken();
if (existingToken) {
    api.defaults.headers.common.Authorization = `Bearer ${existingToken}`;
}

api.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            const url = error.config?.url ?? '';
            if (!url.includes('/auth/login')) {
                setAuthToken(null);
                window.dispatchEvent(new Event('auth:logout'));
            }
        }

        return Promise.reject(error);
    },
);