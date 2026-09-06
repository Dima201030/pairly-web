import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

const HOST_UID = '7cpc0briApPCT8VqlN1G9wc8xO32';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(idToken);
    const callerUid = decoded.uid;

    const callerDoc = await adminDb.collection('users').doc(callerUid).get();
    const callerRole = callerDoc.data()?.role ?? 'user';
    const isCallerStaff = callerUid === HOST_UID || callerRole === 'moderator' || callerRole === 'host';

    if (!isCallerStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { targetUid } = await request.json();
    if (!targetUid || typeof targetUid !== 'string') {
      return NextResponse.json({ error: 'Missing targetUid' }, { status: 400 });
    }

    if (targetUid === HOST_UID) {
      return NextResponse.json({ error: 'Cannot delete host account' }, { status: 400 });
    }

    await adminAuth.deleteUser(targetUid);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[api/admin/delete-user]', err);
    if (err.code === 'auth/user-not-found') {
      return NextResponse.json({ ok: true, note: 'Auth account already deleted' });
    }
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
