import { collection, addDoc, query, orderBy, onSnapshot, getDocs, doc, getDoc, setDoc, serverTimestamp, deleteDoc, where } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable, deleteObject } from 'firebase/storage';
import { db } from './config';
import { PostType } from '../app/types';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

interface PostData {
  eventName: string;
  startDate: string;
  endDate: string;
  textMessage?: string;
  voiceMessage?: File | Blob;
  images?: File[];
  latitude: number;
  longitude: number;
  createdBy: string;
  userId?: string;
}

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

export const createPost = async (postData: PostData): Promise<string> => {
  try {
    const db = getFirestore();
    const storage = getStorage();
    const currentUser = getAuth().currentUser;

    if (!currentUser) {
      throw new Error('User must be authenticated to create a post');
    }

    // Upload voice message if exists
    let voiceMessageUrl = null;
    if (postData.voiceMessage) {
      const timestamp = Date.now();
      const voiceRef = ref(storage, `voice/${currentUser.uid}/${timestamp}_voice.wav`);
      await uploadBytes(voiceRef, postData.voiceMessage);
      voiceMessageUrl = await getDownloadURL(voiceRef);
    }

    // Upload images if they exist
    const imageUrls = [];
    if (postData.images && postData.images.length > 0) {
      for (const image of postData.images) {
        const timestamp = Date.now();
        const imageRef = ref(storage, `images/${currentUser.uid}/${timestamp}_${image.name}`);
        await uploadBytes(imageRef, image);
        const url = await getDownloadURL(imageRef);
        imageUrls.push(url);
      }
    }

    // Create post document
    const postRef = doc(collection(db, 'posts'));
    const postId = postRef.id;

    const post = {
      id: postId,
      eventName: postData.eventName,
      startDate: postData.startDate,
      endDate: postData.endDate,
      textMessage: postData.textMessage || '',
      voiceMessage: voiceMessageUrl,
      images: imageUrls,
      latitude: postData.latitude,
      longitude: postData.longitude,
      createdBy: postData.createdBy,
      userId: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    console.log('Creating post with data:', post);
    await setDoc(postRef, post);
    console.log('Post created successfully with ID:', postId);

    return postId;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
};

export const fetchPosts = async (): Promise<PostType[]> => {
  const snapshot = await getDocs(collection(db, 'posts'));
  return snapshot.docs.map(doc => ({ 
    id: doc.id,
    eventName: doc.data().eventName || '',
    startDate: doc.data().startDate || '',
    endDate: doc.data().endDate || '',
    textMessage: doc.data().textMessage || '',
    voiceMessage: doc.data().voiceMessage || '',
    images: doc.data().images || [],
    latitude: doc.data().latitude || 0,
    longitude: doc.data().longitude || 0,
    createdBy: doc.data().createdBy || '',
    timestamp: doc.data().timestamp || new Date()
  }));
};

export const getPostById = async (postId: string): Promise<any> => {
  try {
    const db = getFirestore();
    const docRef = doc(db, 'posts', postId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        eventName: data.eventName,
        startDate: data.startDate,
        endDate: data.endDate,
        textMessage: data.textMessage,
        voiceMessage: data.voiceMessage,
        images: data.images || [],
        latitude: data.latitude,
        longitude: data.longitude,
        createdBy: data.createdBy,
        userId: data.userId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    } else {
      console.log('No such document!');
      return null;
    }
  } catch (error) {
    console.error('Error getting document:', error);
    throw error;
  }
};

export const cleanupExpiredEvents = async () => {
  try {
    const db = getFirestore();
    const storage = getStorage();
    const now = new Date();
    
    // Query for expired events
    const eventsRef = collection(db, 'posts');
    const q = query(eventsRef, where('endDate', '<', now.toISOString()));
    const querySnapshot = await getDocs(q);

    // Process each expired event
    for (const doc of querySnapshot.docs) {
      const eventData = doc.data();
      
      // Delete images from storage
      if (eventData.images && Array.isArray(eventData.images)) {
        for (const imageUrl of eventData.images) {
          try {
            // Extract the path from the full URL
            const path = decodeURIComponent(imageUrl.split('/o/')[1].split('?')[0]);
            const imageRef = ref(storage, path);
            await deleteObject(imageRef);
            console.log(`Deleted image: ${path}`);
          } catch (error) {
            console.error(`Error deleting image: ${error}`);
          }
        }
      }

      // Delete voice message from storage if exists
      if (eventData.voiceMessage) {
        try {
          const path = decodeURIComponent(eventData.voiceMessage.split('/o/')[1].split('?')[0]);
          const voiceRef = ref(storage, path);
          await deleteObject(voiceRef);
          console.log(`Deleted voice message: ${path}`);
        } catch (error) {
          console.error(`Error deleting voice message: ${error}`);
        }
      }

      // Delete the event document
      await deleteDoc(doc.ref);
      console.log(`Deleted event document: ${doc.id}`);
    }

    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
};

// Function to start periodic cleanup
export const startPeriodicCleanup = () => {
  // Run cleanup every hour
  setInterval(async () => {
    try {
      await cleanupExpiredEvents();
    } catch (error) {
      console.error('Error in periodic cleanup:', error);
    }
  }, 60 * 60 * 1000); // 1 hour in milliseconds

  // Also run immediately on startup
  cleanupExpiredEvents().catch(console.error);
};
