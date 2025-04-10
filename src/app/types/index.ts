export interface UserType {
  email: string;
  displayName: string;
  photoURL: string;
}

export interface MessageType {
  id: string;
  sender: string;
  receiver: string;
  text: string;
  timestamp: any;
}

export type PostType = {
  id: string;
  name: string;
  message: string;
  latitude: number;
  longitude: number;
  createdBy: string;
  timestamp: any; // Or Firebase Timestamp type
};

export type LocationType = { lat: number; lng: number };