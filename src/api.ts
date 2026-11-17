const secureAuthUrl = (url: string): string => {
    const baseUrl = typeof document !== 'undefined' ? document.baseURI
        : typeof window !== 'undefined' ? window.location.href : undefined;
    const resolved = new URL(url, baseUrl);
    const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(resolved.hostname);

    if (resolved.protocol !== 'https:' && !(resolved.protocol === 'http:' && isLoopback)) {
        throw new Error('Authentication endpoints must use HTTPS (HTTP is allowed only for localhost development)');
    }

    return resolved.href;
};

export const apiFetch = async (
    url: string,
    options: RequestInit = {},
    refreshUrl?: string
) => {
    const requestUrl = secureAuthUrl(url);
    const resolvedRefreshUrl = refreshUrl ? secureAuthUrl(refreshUrl) : undefined;
    const requestOptions: RequestInit = {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options,
        // Require final endpoint URLs so redirects cannot downgrade HTTPS.
        redirect: 'error'
    };
    const res = await fetch(requestUrl, requestOptions);

    // Handle 401 with refresh token
    if (res.status === 401 && resolvedRefreshUrl && requestUrl !== resolvedRefreshUrl) {
        const refresh = await fetch(resolvedRefreshUrl, {
            method: 'POST',
            credentials: 'include',
            redirect: 'error'
        });
        if (refresh.ok) {
            return fetch(requestUrl, requestOptions);
        }
    }

    return res;
};
