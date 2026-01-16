
/**
 * Servizio Google Drive per Abivet Pro (Versione Web)
 * Gestisce l'autenticazione tramite Google Identity Services.
 */

const CLIENT_ID = "915076223108-5nmj7d2175tk858861cc5ddo3fqml2b8.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email";

let accessToken: string | null = null;
let userInfo: any = null;
let tokenClient: any = null;

export const initGoogleAuth = () => {
  return new Promise((resolve) => {
    const checkG = setInterval(() => {
      if ((window as any).google && (window as any).google.accounts) {
        clearInterval(checkG);
        
        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: async (response: any) => {
            if (response.access_token) {
              accessToken = response.access_token;
              try {
                const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${accessToken}` }
                });
                userInfo = await userRes.json();
                if ((window as any).onAuthSuccess) {
                  (window as any).onAuthSuccess();
                }
              } catch (e) {
                console.error("Errore recupero info utente", e);
              }
              resolve(true);
            } else {
              resolve(false);
            }
          },
        });
        resolve(true);
      }
    }, 100);
  });
};

export const signIn = () => {
  if (!tokenClient) {
    console.error("Client Google non inizializzato");
    return;
  }
  // Richiede il token (aprirà il popup di Google)
  tokenClient.requestAccessToken({ prompt: 'consent' });
};

export const isLoggedIn = () => accessToken !== null;
export const getUserInfo = () => userInfo;

export const saveToDrive = async (data: any) => {
  if (!accessToken) return false;

  const fileName = "abivet_cloud_backup.json";
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and parents in 'appDataFolder'&spaces=appDataFolder`;
  
  try {
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const searchData = await searchRes.json();
    const fileId = searchData.files && searchData.files[0] ? searchData.files[0].id : null;

    const metadata = {
      name: fileName,
      parents: ["appDataFolder"]
    };

    const formData = new FormData();
    formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    formData.append("file", new Blob([JSON.stringify(data)], { type: "application/json" }));

    let url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    let method = "POST";

    if (fileId) {
      url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
      method = "PATCH";
    }

    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData
    });

    return response.ok;
  } catch (e) {
    console.error("Errore salvataggio Drive:", e);
    return false;
  }
};

export const loadFromDrive = async () => {
  if (!accessToken) return null;

  const fileName = "abivet_cloud_backup.json";
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and parents in 'appDataFolder'&spaces=appDataFolder`;
  
  try {
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const searchData = await searchRes.json();
    const fileId = searchData.files && searchData.files[0] ? searchData.files[0].id : null;

    if (!fileId) return null;

    const getUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const response = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.error("Errore caricamento Drive:", e);
  }
  return null;
};
