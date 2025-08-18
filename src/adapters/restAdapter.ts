import { apiFetch } from "../api";
import { AuthAdapter, Endpoints } from "../types";

export const RestAuthAdapter = (endpoints: Endpoints): AuthAdapter => ({
    login: async (credentials) => {
        await apiFetch(`${endpoints.baseUrl}${endpoints.login}`, {
            method: "POST",
            body: JSON.stringify(credentials),
        });
    },
    logout: async () => {
        await apiFetch(`${endpoints.baseUrl}${endpoints.logout}`, { method: "POST" });
    },
    refresh: async () => {
        await apiFetch(`${endpoints.baseUrl}${endpoints.refresh}`, { method: "POST" });
    },
    getUser: async () => {
        const res = await apiFetch(`${endpoints.baseUrl}${endpoints.user}`);
        return res.ok ? await res.json() : null;
    },
});
