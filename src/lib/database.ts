import { createClient } from '@supabase/supabase-js';
import { UserProfile, ChatMessage, AnalyticsData } from '@/types/profile';
import { config } from './config';

// Create Supabase client only if credentials are available and valid
const supabase = config.supabase.url && 
                 config.supabase.anonKey && 
                 config.supabase.url.startsWith('https://') &&
                 !config.supabase.url.includes('your-project') // Avoid template URLs
  ? createClient(config.supabase.url, config.supabase.anonKey)
  : null;

export class DatabaseService {
  constructor() {
    if (!supabase) {
      console.info('💾 Database Service: Using local storage fallback (Supabase not configured)');
    } else {
      console.info('🗄️ Database Service: Connected to Supabase');
    }
  }

  async createUserProfile(sessionId: string): Promise<UserProfile> {
    const newProfile: UserProfile = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      conversation_history: [],
      evaluation: {
        compatibility_score: 50,
        flags: { red: [], green: [] },
        notes: [],
        recommendation: 'neutral',
      },
      created_at: new Date(),
      last_interaction: new Date(),
    };

    if (!supabase) {
      // Use local storage if Supabase is not configured
      return this.saveToLocalStorage(newProfile);
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .insert([newProfile])
      .select()
      .single();

    if (error) {
      console.warn('Database unavailable for user profile creation, using local storage:', error.message || 'Unknown error');
      // Fallback to local storage if database is not available
      return this.saveToLocalStorage(newProfile);
    }

    return data;
  }

  async getUserProfile(sessionId: string): Promise<UserProfile | null> {
    if (!supabase) {
      // Use local storage if Supabase is not configured
      return this.getFromLocalStorage(sessionId);
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      // Check if this is a "not found" error (expected behavior)
      const isNotFoundError = error.code === 'PGRST116' || 
                              (error.message && error.message.includes('No rows returned'));
      
      if (!isNotFoundError) {
        // Only log unexpected errors with more context
        console.warn('Database unavailable for profile fetch, using local storage:', {
          code: error.code || 'unknown',
          message: error.message || 'Connection failed'
        });
      }
      
      // Fallback to local storage
      return this.getFromLocalStorage(sessionId);
    }

    return data;
  }

  async updateUserProfile(profile: UserProfile): Promise<UserProfile> {
    if (!supabase) {
      // Use local storage if Supabase is not configured
      return this.saveToLocalStorage(profile);
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...profile,
        last_interaction: new Date(),
      })
      .eq('id', profile.id)
      .select()
      .single();

    if (error) {
      console.warn('Database unavailable for user profile update, using local storage:', error.message || 'Unknown error');
      // Fallback to local storage
      return this.saveToLocalStorage(profile);
    }

    return data;
  }

  async addMessage(sessionId: string, message: ChatMessage): Promise<void> {
    const profile = await this.getUserProfile(sessionId);
    if (!profile) return;

    profile.conversation_history.push(message);
    await this.updateUserProfile(profile);
  }

  async updateCompatibilityScore(
    sessionId: string, 
    score: number, 
    flags: { red: string[]; green: string[] },
    notes: string[] = []
  ): Promise<void> {
    const profile = await this.getUserProfile(sessionId);
    if (!profile) return;

    profile.evaluation.compatibility_score = score;
    profile.evaluation.flags = flags;
    profile.evaluation.notes = notes;

    // Update recommendation based on score
    if (score >= 80) profile.evaluation.recommendation = 'highly_compatible';
    else if (score >= 60) profile.evaluation.recommendation = 'compatible';
    else if (score >= 40) profile.evaluation.recommendation = 'neutral';
    else profile.evaluation.recommendation = 'incompatible';

    await this.updateUserProfile(profile);
  }

  async getAllProfiles(): Promise<UserProfile[]> {
    if (!supabase) {
      // Use local storage if Supabase is not configured
      return this.getAllFromLocalStorage();
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Database unavailable for profiles fetch, using local storage:', error.message || 'Unknown error');
      return this.getAllFromLocalStorage();
    }

    return data || [];
  }

  async getAnalytics(): Promise<AnalyticsData> {
    const profiles = await this.getAllProfiles();
    
    const compatibilityDistribution = profiles.reduce((acc, profile) => {
      acc[profile.evaluation.recommendation] = (acc[profile.evaluation.recommendation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const allRedFlags = profiles.flatMap(p => p.evaluation.flags.red);
    const allGreenFlags = profiles.flatMap(p => p.evaluation.flags.green);

    const commonRedFlags = allRedFlags.reduce((acc, flag) => {
      acc[flag] = (acc[flag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonGreenFlags = allGreenFlags.reduce((acc, flag) => {
      acc[flag] = (acc[flag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgConversationLength = profiles.length > 0 
      ? profiles.reduce((sum, p) => sum + p.conversation_history.length, 0) / profiles.length 
      : 0;

    return {
      total_interactions: profiles.length,
      compatibility_distribution: compatibilityDistribution,
      common_red_flags: commonRedFlags,
      common_green_flags: commonGreenFlags,
      average_conversation_length: avgConversationLength,
      peak_interaction_times: [], // TODO: Implement time analysis
    };
  }

  // Fallback local storage methods for when database is not available
  async clearConversationHistory(sessionId: string): Promise<void> {
    if (!supabase) {
      // Use local storage if Supabase is not configured
      return this.clearFromLocalStorage(sessionId);
    }

    try {
      // Clear conversation history from database
      const { error } = await supabase
        .from('user_profiles')
        .update({ conversation_history: [] })
        .eq('session_id', sessionId);

      if (error) {
        console.warn('Database unavailable for clearing conversation history, using local storage:', error.message || 'Unknown error');
        // Fallback to local storage if database is not available
        return this.clearFromLocalStorage(sessionId);
      }
    } catch (error) {
      console.warn('Database unavailable for clearing conversation history, using local storage:', error);
      // Fallback to local storage if database is not available
      return this.clearFromLocalStorage(sessionId);
    }
  }

  private saveToLocalStorage(profile: UserProfile): UserProfile {
    if (typeof window !== 'undefined') {
      const profiles = this.getAllFromLocalStorage();
      const existingIndex = profiles.findIndex(p => p.id === profile.id);
      
      if (existingIndex >= 0) {
        profiles[existingIndex] = profile;
      } else {
        profiles.push(profile);
      }
      
      localStorage.setItem('user_profiles', JSON.stringify(profiles));
    }
    return profile;
  }

  private getFromLocalStorage(sessionId: string): UserProfile | null {
    if (typeof window !== 'undefined') {
      const profiles = this.getAllFromLocalStorage();
      return profiles.find(p => p.session_id === sessionId) || null;
    }
    return null;
  }

  private clearFromLocalStorage(sessionId: string): void {
    if (typeof window !== 'undefined') {
      const profiles = this.getAllFromLocalStorage();
      const profileIndex = profiles.findIndex(p => p.session_id === sessionId);
      
      if (profileIndex >= 0) {
        profiles[profileIndex].conversation_history = [];
        localStorage.setItem('user_profiles', JSON.stringify(profiles));
      }
    }
  }

  private getAllFromLocalStorage(): UserProfile[] {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user_profiles');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  }
}

export const databaseService = new DatabaseService();
