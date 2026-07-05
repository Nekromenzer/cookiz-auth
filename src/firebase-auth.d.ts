declare module "firebase/auth" {
    export function signInWithEmailAndPassword(
        auth: any,
        email: string,
        password: string
    ): Promise<{ user: any }>;

    export function signOut(auth: any): Promise<void>;

    export function getIdToken(
        user: any,
        forceRefresh?: boolean
    ): Promise<string>;

    export function onAuthStateChanged(
        auth: any,
        nextOrObserver: (user: any | null) => void
    ): () => void;
}
