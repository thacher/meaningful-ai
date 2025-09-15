import { ChatMessage, UserProfile, ProfileConfig } from '@/types/profile';
import { getProfileConfig } from './config';

export class EvaluationEngine {
  private config: ProfileConfig;

  constructor() {
    this.config = getProfileConfig();
  }

  /**
   * Evaluates a conversation and returns a comprehensive compatibility score
   */
  evaluateCompatibility(messages: ChatMessage[], existingProfile?: UserProfile): {
    score: number;
    flags: { red: string[]; green: string[] };
    factors: Record<string, number>;
    reasoning: string;
  } {
    const userMessages = messages.filter(m => m.type === 'user');
    if (userMessages.length === 0) {
      return {
        score: 50,
        flags: { red: [], green: [] },
        factors: {},
        reasoning: 'No user messages to evaluate'
      };
    }

    const factors = this.evaluateFactors(userMessages);
    const flags = this.detectFlags(userMessages);
    
    // Adjust evaluation based on existing profile if available
    if (existingProfile) {
      // Consider conversation history length for context
      const historyLength = existingProfile.conversation_history.length;
      if (historyLength > 10) {
        factors.conversation_depth = Math.min(100, factors.conversation_depth + 10);
      }
      
      // Consider previous compatibility score for consistency
      const previousScore = existingProfile.evaluation.compatibility_score;
      if (previousScore > 70) {
        factors.consistency = 85;
      } else if (previousScore < 30) {
        factors.consistency = 25;
      } else {
        factors.consistency = previousScore;
      }
    }
    
    const score = this.calculateWeightedScore(factors);
    const reasoning = this.generateReasoning(factors, flags, score);

    return { score, flags, factors, reasoning };
  }

  private evaluateFactors(messages: ChatMessage[]): Record<string, number> {
    const factors: Record<string, number> = {};
    
    // Depth of responses (0-100)
    factors.depth_of_responses = this.evaluateDepth(messages);
    
    // Emotional intelligence (0-100)
    factors.emotional_intelligence = this.evaluateEmotionalIntelligence(messages);
    
    // Value alignment (0-100)
    factors.value_alignment = this.evaluateValueAlignment(messages);
    
    // Communication style (0-100)
    factors.communication_style = this.evaluateCommunicationStyle(messages);
    
    // Growth orientation (0-100)
    factors.growth_orientation = this.evaluateGrowthOrientation(messages);
    
    // Authenticity (0-100)
    factors.authenticity = this.evaluateAuthenticity(messages);
    
    // Respectfulness (0-100)
    factors.respectfulness = this.evaluateRespectfulness(messages);
    
    // Intellectual curiosity (0-100)
    factors.intellectual_curiosity = this.evaluateIntellectualCuriosity(messages);

    return factors;
  }

  private evaluateDepth(messages: ChatMessage[]): number {
    const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0);
    const avgLength = totalLength / messages.length;
    
    // Longer messages generally indicate more thoughtful responses
    // Scale: <20 chars = 20, 20-50 = 40, 50-100 = 60, 100-200 = 80, >200 = 100
    if (avgLength < 20) return 20;
    if (avgLength < 50) return 40;
    if (avgLength < 100) return 60;
    if (avgLength < 200) return 80;
    return 100;
  }

  private evaluateEmotionalIntelligence(messages: ChatMessage[]): number {
    const content = messages.map(m => m.content.toLowerCase()).join(' ');
    
    // Keywords that indicate emotional intelligence
    const emotionalKeywords = [
      'feel', 'feelings', 'emotion', 'empathy', 'understand', 'perspective',
      'support', 'challenging', 'vulnerability', 'connection', 'intuition',
      'aware', 'mindful', 'compassion', 'patience'
    ];
    
    const matches = emotionalKeywords.filter(keyword => content.includes(keyword)).length;
    return Math.min(100, matches * 15); // Cap at 100
  }

  private evaluateValueAlignment(messages: ChatMessage[]): number {
    const content = messages.map(m => m.content.toLowerCase()).join(' ');
    const configValues = this.config.values.map(v => v.toLowerCase());
    
    // Check for alignment with configured values
    let alignmentScore = 0;
    configValues.forEach(value => {
      if (content.includes(value) || this.checkValueSynonyms(content, value)) {
        alignmentScore += 100 / configValues.length;
      }
    });

    // Check for value-related concepts
    const valueKeywords = [
      'integrity', 'honest', 'growth', 'learning', 'purpose', 'meaning',
      'authentic', 'genuine', 'respect', 'kind', 'empathy', 'curious'
    ];
    
    const valueMatches = valueKeywords.filter(keyword => content.includes(keyword)).length;
    const conceptScore = Math.min(50, valueMatches * 10);
    
    return Math.min(100, alignmentScore + conceptScore);
  }

  private checkValueSynonyms(content: string, value: string): boolean {
    const synonyms: Record<string, string[]> = {
      'authenticity': ['genuine', 'real', 'honest', 'true', 'sincere'],
      'growth': ['learning', 'development', 'improvement', 'evolving', 'progress'],
      'purpose': ['meaning', 'mission', 'calling', 'passion', 'goal'],
      'respect': ['consideration', 'regard', 'appreciation', 'value'],
      'curiosity': ['interested', 'wonder', 'explore', 'discover', 'learn']
    };
    
    return synonyms[value]?.some(synonym => content.includes(synonym)) || false;
  }

  private evaluateCommunicationStyle(messages: ChatMessage[]): number {
    let score = 50; // Base score
    
    const content = messages.map(m => m.content).join(' ');
    
    // Positive indicators
    if (this.hasQuestions(content)) score += 15; // Shows engagement
    if (this.hasPositiveLanguage(content)) score += 15; // Optimistic tone
    if (this.hasStructuredThoughts(content)) score += 10; // Clear communication
    if (this.showsActiveListening(content)) score += 10; // Builds on conversation
    
    // Negative indicators
    if (this.hasNegativeLanguage(content)) score -= 20;
    if (this.isOverlyBrief(messages)) score -= 15;
    if (this.hasGrammarIssues(content)) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  private evaluateGrowthOrientation(messages: ChatMessage[]): number {
    const content = messages.map(m => m.content.toLowerCase()).join(' ');
    
    const growthKeywords = [
      'learn', 'grow', 'improve', 'develop', 'change', 'evolve', 'progress',
      'challenge', 'overcome', 'better', 'feedback', 'mistake', 'lesson'
    ];
    
    const matches = growthKeywords.filter(keyword => content.includes(keyword)).length;
    return Math.min(100, matches * 12);
  }

  private evaluateAuthenticity(messages: ChatMessage[]): number {
    let score = 50;
    
    const content = messages.map(m => m.content).join(' ');
    
    // Check for personal sharing
    if (this.hasPersonalSharing(content)) score += 20;
    
    // Check for specific examples vs generic responses
    if (this.hasSpecificExamples(content)) score += 20;
    
    // Check for consistent voice across messages
    if (this.hasConsistentVoice(messages)) score += 10;
    
    // Penalize overly perfect or scripted responses
    if (this.seemsScripted(content)) score -= 30;
    
    return Math.max(0, Math.min(100, score));
  }

  private evaluateRespectfulness(messages: ChatMessage[]): number {
    let score = 100; // Start high, deduct for issues
    
    const content = messages.map(m => m.content.toLowerCase()).join(' ');
    
    // Red flags that reduce score
    const disrespectfulPatterns = [
      'stupid', 'dumb', 'idiot', 'shut up', 'whatever',
      'don\'t care', 'boring', 'waste of time'
    ];
    
    disrespectfulPatterns.forEach(pattern => {
      if (content.includes(pattern)) score -= 25;
    });
    
    // Check for politeness indicators
    const politeWords = ['please', 'thank', 'appreciate', 'respect', 'understand'];
    const politeMatches = politeWords.filter(word => content.includes(word)).length;
    score += politeMatches * 5;
    
    return Math.max(0, Math.min(100, score));
  }

  private evaluateIntellectualCuriosity(messages: ChatMessage[]): number {
    const content = messages.map(m => m.content).join(' ');
    
    let score = 0;
    
    // Count questions asked
    const questionCount = (content.match(/\?/g) || []).length;
    score += questionCount * 10;
    
    // Look for curiosity indicators
    const curiosityWords = [
      'why', 'how', 'what if', 'interesting', 'curious', 'wonder',
      'explore', 'discover', 'learn more', 'tell me about'
    ];
    
    const matches = curiosityWords.filter(word => content.toLowerCase().includes(word)).length;
    score += matches * 8;
    
    return Math.min(100, score);
  }

  private detectFlags(messages: ChatMessage[]): { red: string[]; green: string[] } {
    const content = messages.map(m => m.content.toLowerCase()).join(' ');
    const redFlags: string[] = [];
    const greenFlags: string[] = [];
    
    // Check for red flags
    this.config.filters.redFlags.forEach(flag => {
      if (this.checkForFlag(content, flag)) {
        redFlags.push(flag);
      }
    });
    
    // Check for green flags
    this.config.filters.greenFlags.forEach(flag => {
      if (this.checkForFlag(content, flag)) {
        greenFlags.push(flag);
      }
    });
    
    return { red: redFlags, green: greenFlags };
  }

  private checkForFlag(content: string, flag: string): boolean {
    // Simple keyword matching - could be enhanced with ML
    const keywords = flag.toLowerCase().split(' ');
    return keywords.some(keyword => content.includes(keyword));
  }

  private calculateWeightedScore(factors: Record<string, number>): number {
    const weights = this.config.evaluation_criteria.scoring_weights;
    let totalScore = 0;
    let totalWeight = 0;
    
    Object.entries(weights).forEach(([factor, weight]) => {
      if (factors[factor] !== undefined) {
        totalScore += factors[factor] * weight;
        totalWeight += weight;
      }
    });
    
    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;
  }

  private generateReasoning(
    factors: Record<string, number>, 
    flags: { red: string[]; green: string[] }, 
    score: number
  ): string {
    const strongPoints = Object.entries(factors)
      .filter(([, value]) => value >= 70)
      .map(([key]) => key.replace('_', ' '));
    
    const weakPoints = Object.entries(factors)
      .filter(([, value]) => value <= 40)
      .map(([key]) => key.replace('_', ' '));
    
    let reasoning = `Overall compatibility score: ${score}/100. `;
    
    if (strongPoints.length > 0) {
      reasoning += `Strong areas: ${strongPoints.join(', ')}. `;
    }
    
    if (weakPoints.length > 0) {
      reasoning += `Areas for concern: ${weakPoints.join(', ')}. `;
    }
    
    if (flags.green.length > 0) {
      reasoning += `Positive indicators: ${flags.green.slice(0, 2).join(', ')}. `;
    }
    
    if (flags.red.length > 0) {
      reasoning += `Warning signs: ${flags.red.slice(0, 2).join(', ')}. `;
    }
    
    return reasoning.trim();
  }

  // Helper methods for communication style evaluation
  private hasQuestions(content: string): boolean {
    return (content.match(/\?/g) || []).length > 0;
  }

  private hasPositiveLanguage(content: string): boolean {
    const positiveWords = ['great', 'wonderful', 'amazing', 'love', 'enjoy', 'excited', 'happy'];
    return positiveWords.some(word => content.toLowerCase().includes(word));
  }

  private hasNegativeLanguage(content: string): boolean {
    const negativeWords = ['hate', 'terrible', 'awful', 'stupid', 'boring', 'waste'];
    return negativeWords.some(word => content.toLowerCase().includes(word));
  }

  private hasStructuredThoughts(content: string): boolean {
    // Check for structure indicators like "first", "second", "also", "however"
    const structureWords = ['first', 'second', 'also', 'however', 'therefore', 'because'];
    return structureWords.some(word => content.toLowerCase().includes(word));
  }

  private showsActiveListening(content: string): boolean {
    const listeningWords = ['you mentioned', 'you said', 'i understand', 'that makes sense'];
    return listeningWords.some(phrase => content.toLowerCase().includes(phrase));
  }

  private isOverlyBrief(messages: ChatMessage[]): boolean {
    const avgLength = messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;
    return avgLength < 15; // Very short responses
  }

  private hasGrammarIssues(content: string): boolean {
    // Simple check for basic grammar issues
    const issues = [
      /\bi\b/g, // lowercase 'i'
      /[a-z]\.[a-z]/g, // missing space after period
      /\s{2,}/g // multiple spaces
    ];
    return issues.some(pattern => pattern.test(content));
  }

  private hasPersonalSharing(content: string): boolean {
    const personalIndicators = ['i feel', 'i think', 'i believe', 'my experience', 'i remember'];
    return personalIndicators.some(phrase => content.toLowerCase().includes(phrase));
  }

  private hasSpecificExamples(content: string): boolean {
    const exampleWords = ['for example', 'like when', 'such as', 'specifically', 'instance'];
    return exampleWords.some(word => content.toLowerCase().includes(word));
  }

  private hasConsistentVoice(messages: ChatMessage[]): boolean {
    // Simple check for consistent writing style
    if (messages.length < 2) return true;
    
    const styles = messages.map(m => ({
      length: m.content.length,
      questions: (m.content.match(/\?/g) || []).length,
      exclamations: (m.content.match(/!/g) || []).length
    }));
    
    // Check if style is relatively consistent
    const avgLength = styles.reduce((sum, s) => sum + s.length, 0) / styles.length;
    const lengthVariance = styles.every(s => Math.abs(s.length - avgLength) < avgLength * 0.5);
    
    return lengthVariance;
  }

  private seemsScripted(content: string): boolean {
    const scriptedPhrases = [
      'thank you for asking',
      'that\'s a great question',
      'i appreciate your interest',
      'as i mentioned before'
    ];
    return scriptedPhrases.some(phrase => content.toLowerCase().includes(phrase));
  }
}

export const evaluationEngine = new EvaluationEngine();
