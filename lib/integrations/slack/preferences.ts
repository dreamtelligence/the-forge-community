export type SlackPreferenceKey =
  | 'ventureCreated'
  | 'squadMemberJoined'
  | 'decisionMade'
  | 'taskCompleted'
  | 'forumActivity'
  | 'marketingGenerated'
  | 'supplierUpdate'
  | 'dailyDigest'
  | 'weeklyReport';

export type SlackPreferenceMap = Record<SlackPreferenceKey, boolean>;

export const defaultSlackPreferences: SlackPreferenceMap = {
  ventureCreated: true,
  squadMemberJoined: true,
  decisionMade: true,
  taskCompleted: true,
  forumActivity: false,
  marketingGenerated: true,
  supplierUpdate: true,
  dailyDigest: false,
  weeklyReport: true,
};
