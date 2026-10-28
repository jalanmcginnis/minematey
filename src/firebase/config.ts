import firebaseAppletConfig from '../../firebase-applet-config.json';

// This is the complete and correct Firebase configuration.
export const firebaseConfig = {
  ...firebaseAppletConfig,
  firestoreDatabaseId: firebaseAppletConfig.firestoreDatabaseId || '(default)',
};

export default firebaseConfig;

