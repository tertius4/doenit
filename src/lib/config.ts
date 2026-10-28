import { PUBLIC_GOOGLE_AUTH } from "$env/static/public";
import * as env from "$env/static/public";
import { is_web } from "$services/platform";

export const config = {
  /** Photos live on the phone's file system, so they are not offered on the web. */
  photos_enabled: !is_web,
  google_web_client_id: PUBLIC_GOOGLE_AUTH,
  /** iOS OAuth client. The Google plugin cannot sign in on iOS without it. */
  google_ios_client_id: env.PUBLIC_GOOGLE_AUTH_IOS,
  /** Not used at OS level; it only tells the plugin to initialise the Apple provider. */
  apple_client_id: env.PUBLIC_APP_ID,
  firebase_config: {
    apiKey: env.PUBLIC_FIREBASE_API_KEY,
    authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.PUBLIC_FIREBASE_APP_ID,
  },
};
