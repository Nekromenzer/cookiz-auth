import type { CsrfConfig } from './types';

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
    refreshUrl?: string,
    csrf?: CsrfConfig
) => {
    const requestUrl = secureAuthUrl(url);
    const resolvedRefreshUrl = refreshUrl ? secureAuthUrl(refreshUrl) : undefined;
    const requestOptions = async (init: RequestInit): Promise<RequestInit> => {
        const headers = new Headers(init.headers);
        if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
        if (csrf) {
            const token = await csrf.getToken();
            if (typeof token !== 'string' || !token.trim()) {
                throw new Error('A CSRF token is required when CSRF protection is configured');
            }
            headers.set(csrf.headerName || 'X-CSRF-Token', token);
        }
        return {
            credentials: 'include',
            ...init,
            headers,
            // Require final endpoint URLs so redirects cannot downgrade HTTPS.
            redirect: 'error'
        };
    };
    const res = await fetch(requestUrl, await requestOptions(options));

    // Handle 401 with refresh token
    if (res.status === 401 && resolvedRefreshUrl && requestUrl !== resolvedRefreshUrl) {
        const refresh = await fetch(resolvedRefreshUrl, await requestOptions({ method: 'POST' }));
        if (refresh.ok) {
            return fetch(requestUrl, await requestOptions(options));
        }
    }

    return res;
};
