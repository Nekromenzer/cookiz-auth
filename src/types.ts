export interface User {
    id: string;
    name: string;
    email: string;
    [key: string]: any;
}

export interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (credentials: { email: string; password: string }) => Promise<void>;
    logout: () => Promise<void>;
    refresh?: () => Promise<void>; // optional
}

export interface FirebaseConfig {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
}

export interface AuthAdapter {
    login: (credentials: { email: string; password: string }) => Promise<void>;
    logout: () => Promise<void>;
    refresh?: () => Promise<void>;
    getUser: () => Promise<User | null>;
}

export interface Endpoints {
    login: string;
    logout: string;
    user: string;
    refresh?: string;
    baseUrl?: string;
}

export type AuthMode = "default" | "firebase";

export interface AuthProviderProps {
    children: React.ReactNode;
    adapter: AuthAdapter;
}