import { PUBLIC_GOOGLE_AUTH } from "$env/static/public";
import * as env from "$env/static/public";

export const config = {
  photos_enabled: true,
  google_web_client_id: PUBLIC_GOOGLE_AUTH,
  firebase_config: {
    apiKey: env.PUBLIC_FIREBASE_API_KEY,
    authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.PUBLIC_FIREBASE_APP_ID,
  },
};
