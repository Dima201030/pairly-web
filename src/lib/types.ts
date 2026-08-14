export type Sport = 'padel' | 'tennis' | 'badminton' | 'squash' | 'football' | 'running';

export type SkillLevel = 'any' | 'beginner' | 'middle' | 'advanced';

export type TennisType = 'singles' | 'doubles';

export type NTRPRange = 'beginner' | 'intermediate' | 'advanced' | 'open';

export type UserRole = 'user' | 'moderator' | 'support' | 'host';

export type TournamentStatus = 'open' | 'finished' | 'cancelled';

export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
  city: string;
  sport?: Sport;
  level: SkillLevel;
  ntrp?: number;
  rating: number;
  createdAt: Date;
  discoveredSports: Sport[];
  role: UserRole;
  blocked: boolean;
}

export interface Match {
  id: string;
  authorId: string;
  sport: Sport;
  city: string;
  venue: string;
  district: string;
  startDate: Date;
  level: SkillLevel;
  openSpots: number;
  totalSpots: number;
  hostName: string;
  hostRating: number;
  hostNTRP?: number;
  note: string;
  tennisType?: TennisType;
  ntrpRange?: NTRPRange;
  latitude: number;
  longitude: number;
  participants: string[];
}

export interface Tournament {
  id: string;
  title: string;
  sport: Sport;
  city: string;
  venue: string;
  district: string;
  startDate: Date;
  registrationDeadline?: Date;
  level: SkillLevel;
  ntrpRange?: NTRPRange;
  maxParticipants: number;
  participants: string[];
  organizerID: string;
  organizerName: string;
  note: string;
  status: TournamentStatus;
}

export interface SavedVenue {
  id: string;
  name: string;
  city: string;
  district: string;
  sport?: Sport;
  authorID?: string;
  latitude: number;
  longitude: number;
}

export interface ChatMessage {
  id: string;
  matchID: string;
  authorID: string;
  authorName: string;
  text: string;
  sentAt: Date;
}

export type SupportChatStatus = 'waiting' | 'assigned' | 'inProgress' | 'resolved' | 'closed';

export interface SupportChat {
  id: string;
  userID: string;
  userName: string;
  userCity: string;
  assignedStaffID?: string;
  assignedStaffName?: string;
  status: SupportChatStatus;
  lastMessage?: string;
  lastMessageDate?: Date;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupportMessage {
  id: string;
  chatID: string;
  authorID: string;
  authorName: string;
  authorRole: string;
  text: string;
  sentAt: Date;
  read: boolean;
}