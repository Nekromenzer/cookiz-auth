import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase"; // user provides config
import { AuthAdapter, User } from "../types";

export const FirebaseAuthAdapter: AuthAdapter = {
    login: async ({ email, password }) => {
        await signInWithEmailAndPassword(auth, email, password);
    },
    logout: async () => {
        await signOut(auth);
    },
    // Firebase does not have a built-in refresh method, so we leave it empty - its automatically handled by the SDK
    // refresh: async () => { },
    getUser: async () =>
        new Promise<User | null>((resolve) => {
            const unsub = onAuthStateChanged(auth, (fbUser) => {
                if (fbUser) {
                    resolve({ id: fbUser.uid, email: fbUser.email ?? "" });
                } else {
                    resolve(null);
                }
                unsub();
            });
        }),
};
