import { collection, addDoc, query, orderBy, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './config';
import { PostType } from '../app/types';

export const sendMessage = async (chatId: string, sender: string, receiver: string, text: string) => {
  await addDoc(collection(db, 'messages', chatId, 'messages'), {
    sender,
    receiver,
    text,
    timestamp: new Date(),
  });
};

export const listenToMessages = (chatId: string, callback: (messages: any[]) => void) => {
  const q = query(collection(db, 'messages', chatId, 'messages'), orderBy('timestamp'));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(messages);
  });
};

export const createPost = async (post: any) => {
  if (post.latitude === undefined || post.longitude === undefined) throw new Error("Location not provided");
  await addDoc(collection(db, 'posts'), post);
};

export const fetchPosts = async (): Promise<PostType[]> => {
  const snapshot = await getDocs(collection(db, 'posts'));
  return snapshot.docs.map(doc => ({ 
    id: doc.id, 
    name: doc.data().name || '',
    message: doc.data().message || '',
    latitude: doc.data().latitude || 0,
    longitude: doc.data().longitude || 0,
    createdBy: doc.data().createdBy || '',
    timestamp: doc.data().timestamp || new Date()
  }));
};

export const getPostById = async (id: string) => {
  const docRef = doc(db, 'posts', id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};
