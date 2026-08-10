import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCP1gQiRyqiKH-bD8oAMPUXKC0EeTuSJYQ',
  authDomain: 'pairly-dfeec.firebaseapp.com',
  databaseURL: 'https://pairly-dfeec-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'pairly-dfeec',
  storageBucket: 'pairly-dfeec.firebasestorage.app',
  messagingSenderId: '638872844868',
  appId: '1:638872844868:web:2fb6144e8beec563231a11',
  measurementId: 'G-K6YEHBWZG3',
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (typeof window !== 'undefined') {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage };