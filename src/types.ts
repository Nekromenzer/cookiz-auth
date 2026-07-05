export interface User {
    id: string;
    name?: string | null;
    email: string;
    [key: string]: any;
}

export type AuthMode = "cookie" | "firebase";

export interface FirebaseUserLike {
    uid: string;
    displayName: string | null;
    email: string | null;
    emailVerified: boolean;
    phoneNumber: string | null;
    photoURL: string | null;
    providerId: string;
    [key: string]: any;
}

export interface FirebaseAuthLike {
    currentUser: FirebaseUserLike | null;
    [key: string]: any;
}

export interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (credentials: { email: string; password: string }) => Promise<void>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
}

export interface AuthProviderProps {
    children: React.ReactNode;
    mode?: AuthMode;
    endpoints?: {
        login?: string;
        logout?: string;
        user?: string;
        refresh?: string;
        baseUrl?: string;
        me?: string;
    };
    firebaseAuth?: FirebaseAuthLike;
    mapFirebaseUser?: (user: FirebaseUserLike) => User;
}
