import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/documents');

let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuthListener = (
  onSuccess: (user: User, token: string) => void,
  onFailure: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      onSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      onFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No access token returned from Google Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Sign-In failed:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

// --- Google Drive Real API Integration ---

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
}

/**
 * Upload JSON backup directly to Google Drive
 */
export async function uploadToGoogleDrive(
  accessToken: string,
  fileName: string,
  jsonData: object
): Promise<DriveFileItem> {
  const metadata = {
    name: fileName,
    mimeType: 'application/json',
  };

  const fileContent = JSON.stringify(jsonData, null, 2);
  const boundary = 'foo_bar_baz';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Drive Upload Error (${res.status}): ${errText}`);
  }

  return await res.json();
}

/**
 * List Velum backup files in user's Google Drive
 */
export async function listDriveBackups(accessToken: string): Promise<DriveFileItem[]> {
  const query = encodeURIComponent("name contains 'Velum_Backup' and mimeType = 'application/json' and trashed = false");
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,createdTime)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Drive List Error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Download file content from Google Drive
 */
export async function downloadDriveFile(accessToken: string, fileId: string): Promise<any> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to download file from Drive (${res.status})`);
  }

  return await res.json();
}

// --- Google Docs Real API Integration ---

/**
 * Create a real Google Document in user's Google account
 */
export async function createGoogleDocument(
  accessToken: string,
  title: string,
  contentMarkdown: string
): Promise<{ documentId: string; title: string }> {
  // 1. Create blank doc
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: title,
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Docs Creation Error (${createRes.status}): ${errText}`);
  }

  const doc = await createRes.json();
  const documentId = doc.documentId;

  // 2. Insert text into document
  if (contentMarkdown.trim()) {
    const batchRes = await fetch(
      `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: contentMarkdown,
              },
            },
          ],
        }),
      }
    );

    if (!batchRes.ok) {
      console.warn('Doc created but insertText batch failed');
    }
  }

  return { documentId, title };
}

/**
 * List user's Google Documents from Google Drive
 */
export async function listGoogleDocsFiles(accessToken: string): Promise<DriveFileItem[]> {
  const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.document' and trashed = false");
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,createdTime)&pageSize=20`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Drive Docs List Error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Fetch document text content from Google Docs API
 */
export async function readGoogleDocContent(accessToken: string, documentId: string): Promise<{ title: string; content: string }> {
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Docs Read Error (${res.status}): ${errText}`);
  }

  const docData = await res.json();
  const title = docData.title || 'Imported Document';
  
  let fullText = '';
  if (docData.body && Array.isArray(docData.body.content)) {
    docData.body.content.forEach((block: any) => {
      if (block.paragraph && Array.isArray(block.paragraph.elements)) {
        block.paragraph.elements.forEach((elem: any) => {
          if (elem.textRun && elem.textRun.content) {
            fullText += elem.textRun.content;
          }
        });
      }
    });
  }

  return { title, content: fullText };
}

/**
 * Upload a file directly to user's Google Drive
 */
export async function uploadFileToGoogleDrive(
  accessToken: string,
  fileName: string,
  mimeType: string,
  base64OrDataUrl: string
): Promise<{ fileId: string; webViewLink?: string }> {
  try {
    const base64Data = base64OrDataUrl.includes(',') ? base64OrDataUrl.split(',')[1] : base64OrDataUrl;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const fileBlob = new Blob([byteArray], { type: mimeType || 'application/octet-stream' });

    const metadata = {
      name: fileName,
      mimeType: mimeType || 'application/octet-stream',
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', fileBlob);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Drive File Upload Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return { fileId: data.id, webViewLink: data.webViewLink };
  } catch (err: any) {
    console.error('Google Drive Upload Error:', err);
    throw err;
  }
}

// --- Foliex Dedicated Folder Sync ---

/**
 * Get or create the dedicated 'Foliex' folder on user's Google Drive
 */
export async function getOrCreateFoliexFolder(
  accessToken: string,
  folderName = 'Foliex'
): Promise<string> {
  const query = encodeURIComponent(
    `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );

  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (listRes.ok) {
    const data = await listRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Create folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Foliex folder (${createRes.status}): ${errText}`);
  }

  const folder = await createRes.json();
  return folder.id;
}

/**
 * Sync workspace items directly into Foliex_Data.json inside the 'Foliex' Drive folder
 */
export async function syncWorkspaceToFoliexFolder(
  accessToken: string,
  items: any[],
  folderName = 'Foliex'
): Promise<{ fileId: string; folderId: string }> {
  const folderId = await getOrCreateFoliexFolder(accessToken, folderName);
  const dataFileName = 'Foliex_Workspace.json';

  const query = encodeURIComponent(
    `'${folderId}' in parents and name = '${dataFileName}' and trashed = false`
  );

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const fileContent = JSON.stringify(
    {
      updatedAt: new Date().toISOString(),
      appName: 'Foliex',
      version: '1.0',
      items,
    },
    null,
    2
  );

  let existingFileId: string | null = null;

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      existingFileId = searchData.files[0].id;
    }
  }

  if (existingFileId) {
    // Update existing file
    const updateRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: fileContent,
      }
    );

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`Failed to update Foliex data file (${updateRes.status}): ${errText}`);
    }

    return { fileId: existingFileId, folderId };
  } else {
    // Create new file inside the Foliex folder
    const metadata = {
      name: dataFileName,
      mimeType: 'application/json',
      parents: [folderId],
    };

    const boundary = 'foliex_sync_boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      fileContent +
      closeDelimiter;

    const createRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to upload Foliex data (${createRes.status}): ${errText}`);
    }

    const newFile = await createRes.json();
    return { fileId: newFile.id, folderId };
  }
}

/**
 * Load workspace items from Foliex_Workspace.json inside the 'Foliex' folder
 */
export async function loadWorkspaceFromFoliexFolder(
  accessToken: string,
  folderName = 'Foliex'
): Promise<any[] | null> {
  try {
    const folderId = await getOrCreateFoliexFolder(accessToken, folderName);
    const dataFileName = 'Foliex_Workspace.json';

    const query = encodeURIComponent(
      `'${folderId}' in parents and name = '${dataFileName}' and trashed = false`
    );

    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    if (!searchData.files || searchData.files.length === 0) return null;

    const fileId = searchData.files[0].id;
    const downloadRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!downloadRes.ok) return null;

    const parsed = await downloadRes.json();
    return Array.isArray(parsed.items) ? parsed.items : null;
  } catch (err) {
    console.error('Error loading workspace from Foliex Drive folder:', err);
    return null;
  }
}


