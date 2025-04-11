import { collection, addDoc, query, orderBy, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
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
  
  try {
    const storage = getStorage();
    const postData: any = {
      eventName: post.eventName,
      startDate: post.startDate,
      endDate: post.endDate,
      textMessage: post.textMessage,
      latitude: post.latitude,
      longitude: post.longitude,
      createdBy: post.createdBy,
      timestamp: new Date(),
    };

    // Handle voice message upload
    if (post.voiceMessage) {
      try {
        const voiceRef = ref(storage, `voice/${Date.now()}_${post.createdBy.replace(/[^a-zA-Z0-9]/g, '_')}.wav`);
        const metadata = {
          contentType: 'audio/wav',
          customMetadata: {
            'uploadedBy': post.createdBy,
            'uploadedAt': new Date().toISOString()
          }
        };
        
        const uploadTask = uploadBytesResumable(voiceRef, post.voiceMessage, metadata);
        
        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              // Progress monitoring if needed
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log('Voice upload progress:', progress);
            },
            (error) => {
              console.error('Voice upload error:', error);
              reject(error);
            },
            async () => {
              try {
                const voiceUrl = await getDownloadURL(uploadTask.snapshot.ref);
                postData.voiceMessage = voiceUrl;
                resolve(voiceUrl);
              } catch (error) {
                reject(error);
              }
            }
          );
        });
      } catch (error) {
        console.error('Error uploading voice message:', error);
        throw new Error('Failed to upload voice message');
      }
    }

    // Handle image uploads
    if (post.images && post.images.length > 0) {
      try {
        const imageUrls = await Promise.all(
          post.images.map(async (image: File, index: number) => {
            const imageRef = ref(storage, `images/${Date.now()}_${index}_${post.createdBy.replace(/[^a-zA-Z0-9]/g, '_')}`);
            const metadata = {
              contentType: image.type,
              customMetadata: {
                'uploadedBy': post.createdBy,
                'uploadedAt': new Date().toISOString()
              }
            };
            
            const uploadTask = uploadBytesResumable(imageRef, image, metadata);
            
            return new Promise((resolve, reject) => {
              uploadTask.on('state_changed',
                (snapshot) => {
                  // Progress monitoring if needed
                  const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                  console.log(`Image ${index} upload progress:`, progress);
                },
                (error) => {
                  console.error(`Image ${index} upload error:`, error);
                  reject(error);
                },
                async () => {
                  try {
                    const imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(imageUrl);
                  } catch (error) {
                    reject(error);
                  }
                }
              );
            });
          })
        );
        postData.images = imageUrls;
      } catch (error) {
        console.error('Error uploading images:', error);
        throw new Error('Failed to upload images');
      }
    }

    const docRef = await addDoc(collection(db, 'posts'), postData);
    return docRef.id;
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

export const getPostById = async (id: string) => {
  const docRef = doc(db, 'posts', id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};
