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
    refresh: () => Promise<void>;
}

export interface IFirebaseConfig {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
}

export interface AuthProviderProps {
    children: React.ReactNode;
    mode?: "default" | "firebase";
    firebaseConfig?: IFirebaseConfig;
    endpoints?: {
        login?: string;
        logout?: string;
        user?: string;
        refresh?: string;
        baseUrl?: string;
        me?: string;
    };
}
