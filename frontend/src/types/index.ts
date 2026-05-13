export type UserRole = 'donor' | 'recipient' | 'staff' | 'wigmaker' | 'admin';

export interface User {
  id: string;         // UUID from auth.users
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  emailVerifiedAt: string | null;
  email_verified_at?: string | null; // For legacy/direct DB sync
  role: UserRole;
  profilePhotoPath: string | null;
  profile_photo_url?: string | null; // Public URL for avatars
  bio: string | null;
  country: string | null;
  region: string | null;
  postalCode: string | null;
  age: number | null;
  gender: string | null;
  phone: string | null;
  referralCode: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Donation {
  id: string;
  userId: string | null;
  reference: string;
  hairLength: string;
  hairColor: string;
  treatedHair: boolean;
  address: string | null;
  reason: string | null;
  dropoffLocation: string | null;
  appointmentAt: string | null;
  photoFront: string | null;
  photoSide: string | null;
  status: string;
  certificateNo: string | null;
  donorDeliveryLink: string | null;
  receivedWigAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
  statusHistories?: StatusHistory[];
}

export interface HairRequest {
  id: string;
  userId: string | null;
  reference: string;
  contactNumber: string | null;
  gender: string | null;
  story: string | null;
  medicalCertificate: string | null;
  diagnosisPhoto: string | null;
  recipientPhoto: string | null;
  documents: string[] | null;
  additionalPhoto: string | null;
  status: string;
  trackingLink: string | null;
  receivedAt: string | null;
  wigProduction?: WigProduction | null;
  appointmentAt: string | null;
  notes: string | null;
  wigLength: string | null;
  wigColor: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
  statusHistories?: StatusHistory[];
}

export interface WigProduction {
  id: string;
  taskCode: string;
  wigmakerId: string;
  donationId: string | null;
  hairRequestId: string | null;
  targetLength: string;
  targetColor: string;
  status: 'assigned' | 'processing' | 'completed' | 'matched' | 'received' | 'shipped';
  deliveryLink: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  wigmaker?: User;
  donation?: Donation;
  hairRequest?: HairRequest;
}

export interface StatusHistory {
  id: string;
  trackableType: string;
  trackableId: string;
  status: string;
  notes: string | null;
  metadata: any | null;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  userId: string;
  content: string;
  imageUrl: string | null;
  likes: number;
  is_liked: boolean;
  createdAt: string;
  user?: User;
  comments?: CommunityComment[];
}

export interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
  parentId: string | null;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  user?: User;
  replies?: CommunityComment[];
}

export interface AuthResponse {
  user: User;
  redirect: string;
}
