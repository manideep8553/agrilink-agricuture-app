import admin from 'firebase-admin';

let firebaseApp: admin.app.App | null = null;

function getApp(): admin.app.App {
  if (!firebaseApp) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (projectId && privateKey && clientEmail && projectId !== 'your-firebase-project') {
      try {
        firebaseApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey: privateKey.replace(/\\n/g, '\n'),
            clientEmail,
          }),
        });
      } catch {
        console.warn('Firebase initialization failed - push notifications disabled');
      }
    } else {
      console.warn('Firebase credentials not configured - push notifications disabled');
    }
  }
  return firebaseApp!;
}

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    const app = getApp();
    if (!app) return false;

    await app.messaging().send({
      token,
      notification: { title, body },
      data: data || {},
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    const { prisma } = await import('../index');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } });
    if (!user?.fcmToken) return false;
    return sendPushNotification(user.fcmToken, title, body, data);
  } catch {
    return false;
  }
}

export async function sendBulkPush(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<number> {
  let sent = 0;
  for (const userId of userIds) {
    const ok = await sendPushToUser(userId, title, body, data);
    if (ok) sent++;
  }
  return sent;
}
