import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './config';

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
};