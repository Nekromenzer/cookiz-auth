export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';

const buildUrl = (url: string) => /^https?:\/\//i.test(url) ? url : `${API_BASE}${url}`;

export const apiFetch = async (url: string, options: RequestInit = {}) => {
    const requestUrl = buildUrl(url);

    const res = await fetch(requestUrl, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
    });

    // Handle 401 with refresh token
    if (res.status === 401) {
        const refresh = await fetch(`${API_BASE}/refresh`, {
            method: 'POST',
            credentials: 'include'
        });
        if (refresh.ok) {
            return fetch(requestUrl, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
                ...options
            });
        }
    }

    return res;
};
