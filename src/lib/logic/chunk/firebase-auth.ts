export {
  type Unsubscribe,
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  signInWithCredential,
  linkWithCredential,
  fetchSignInMethodsForEmail,
  signOut as signOutFirebase,
  onAuthStateChanged,
  GoogleAuthProvider,
  OAuthProvider,
} from "firebase/auth";
