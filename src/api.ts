export const apiFetch = async (
    url: string,
    options: RequestInit = {},
    refreshUrl?: string
) => {
    const res = await fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
    });

    // Handle 401 with refresh token
    if (res.status === 401 && refreshUrl && url !== refreshUrl) {
        const refresh = await fetch(refreshUrl, {
            method: 'POST',
            credentials: 'include'
        });
        if (refresh.ok) {
            return fetch(url, {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
                ...options
            });
        }
    }

    return res;
};
