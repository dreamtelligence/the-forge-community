import { prisma } from '@/lib/prisma';

type NotificationPreferenceKey = 'forumComments' | 'forumReplies' | 'mentions' | 'system';

const preferenceByType: Record<'FORUM_COMMENT' | 'FORUM_REPLY' | 'SYSTEM', NotificationPreferenceKey> = {
  FORUM_COMMENT: 'forumComments',
  FORUM_REPLY: 'forumReplies',
  SYSTEM: 'system'
};

async function getPreferenceMap(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, { mentions: boolean }>();
  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, mentions: true }
  });
  return new Map(prefs.map(pref => [pref.userId, { mentions: pref.mentions }]));
}

async function shouldNotifyUser(userId: string, key: NotificationPreferenceKey) {
  const [prefs, user] = await Promise.all([
    prisma.notificationPreference.findUnique({
      where: { userId },
      select: {
        forumComments: true,
        forumReplies: true,
        mentions: true,
        system: true
      }
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { accountStatus: true }
    })
  ]);
  if (user?.accountStatus === 'DELETED') return false;
  if (!prefs) return true;
  return prefs[key];
}

/**
 * Creates notifications for mentioned users in a text.
 * @param text The content to scan for mentions (e.g. "@username")
 * @param actorId The ID of the user who performed the action (author)
 * @param resourceId The ID of the resource (postId or commentId)
 * @param resourceType The type of notification ('FORUM_POST_MENTION', 'FORUM_COMMENT_MENTION', etc.)
 * @param link The URL to redirect to
 */
export async function processMentions({
  text,
  actorId,
  resourceId,
  resourceType,
  link,
  title
}: {
  text: string;
  actorId: string;
  resourceId: string;
  resourceType: 'FORUM_COMMENT' | 'FORUM_REPLY' | 'SYSTEM'; // Using existing enum types
  link: string;
  title: string;
}) {
  // Regex to find @mentions. 
  // Matches @username where username can contain letters, numbers, underscores, dots.
  // We assume usernames/slugs don't have spaces for now, or we match until a space.
  // Adjust regex based on your username rules. simple: @[\w\.]+
  const mentionRegex = /@([\w\.\-]+)/g;
  const matches = [...text.matchAll(mentionRegex)];
  
  if (matches.length === 0) return;

  const mentionedNames = new Set(matches.map(m => m[1].toLowerCase()));
  
  // Find users by name or profileSlug
  // We search for both to be safe
  const users = await prisma.user.findMany({
    where: {
      accountStatus: 'ACTIVE',
      OR: [
        { name: { in: Array.from(mentionedNames), mode: 'insensitive' } },
        { profileSlug: { in: Array.from(mentionedNames), mode: 'insensitive' } }
      ],
      AND: {
        id: { not: actorId } // Don't notify yourself
      }
    },
    select: { id: true, name: true }
  });

  if (users.length === 0) return;

  const preferenceMap = await getPreferenceMap(users.map(user => user.id));
  const allowedUsers = users.filter(user => preferenceMap.get(user.id)?.mentions ?? true);
  if (allowedUsers.length === 0) return;

  // Create notifications in batch
  await prisma.notification.createMany({
    data: allowedUsers.map(user => ({
      userId: user.id,
      actorId: actorId,
      type: resourceType,
      title: title, // e.g. "Bucci mentioned you"
      message: text.length > 50 ? text.substring(0, 50) + '...' : text,
      href: link,
      isRead: false
    }))
  });

  console.log(`[Notifications] Sent ${allowedUsers.length} mentions for resource ${resourceId}`);
}

/**
 * Send a notification to a specific user (e.g. reply to a post)
 */
export async function sendNotification({
  recipientId,
  actorId,
  type,
  title,
  message,
  link
}: {
  recipientId: string;
  actorId: string;
  type: 'FORUM_COMMENT' | 'FORUM_REPLY' | 'SYSTEM';
  title: string;
  message?: string;
  link: string;
}) {
  if (recipientId === actorId) return; // Don't notify yourself

  const preferenceKey = preferenceByType[type];
  const allowed = await shouldNotifyUser(recipientId, preferenceKey);
  if (!allowed) return;

  await prisma.notification.create({
    data: {
      userId: recipientId,
      actorId,
      type,
      title,
      message,
      href: link,
      isRead: false
    }
  });
}
