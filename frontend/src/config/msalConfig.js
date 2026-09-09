import { PublicClientApplication } from '@azure/msal-browser';
import { ROUTES } from '@/constants/routes';

// Derived at runtime rather than baked in at build time, so the same bundle
// resolves the correct origin on localhost/trackio/rutqa/rut-portal. Each origin
// must still be registered as an SPA redirect URI on the Entra App Registration.
const microsoftRedirectUri = `${window.location.origin}${ROUTES.MICROSOFT_CALLBACK}`;

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MICROSOFT_TENANT_ID}`,
    redirectUri: microsoftRedirectUri,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);
