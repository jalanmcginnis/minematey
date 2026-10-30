import firebaseAppletConfig from '../../firebase-applet-config.json';

const measurementId = firebaseAppletConfig.measurementId?.trim();

/**
 * Official Firebase web app fields only.
 * storageBucket must be `<project>.appspot.com` or `<project>.firebasestorage.app`
 * with no gs:// prefix. This project’s bucket is the newer firebasestorage.app name;
 * `<project>.appspot.com` does not exist.
 */
export const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey,
  authDomain: firebaseAppletConfig.authDomain,
  projectId: firebaseAppletConfig.projectId,
  storageBucket: firebaseAppletConfig.storageBucket,
  messagingSenderId: firebaseAppletConfig.messagingSenderId,
  appId: firebaseAppletConfig.appId,
  ...(measurementId ? { measurementId } : {}),
};

export default firebaseConfig;
