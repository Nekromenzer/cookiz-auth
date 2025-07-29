export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export const apiFetch = async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, {
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        ...options
    });

    if (res.status === 401) {
        const refresh = await fetch(url.replace(/\/[^/]+$/, "/refresh"), {
            method: "POST",
            credentials: "include"
        });
        if (refresh.ok) {
            return fetch(url, {
                credentials: "include",
                headers: { "Content-Type": "application/json", ...(options.headers || {}) },
                ...options
            });
        }
    }

    return res;
};
