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
  eventName: string;
  startDate: string;
  endDate: string;
  textMessage?: string;
  voiceMessage?: string;
  images?: string[];
  latitude: number;
  longitude: number;
  createdBy: string;
  timestamp: any;
};

export type LocationType = { lat: number; lng: number };