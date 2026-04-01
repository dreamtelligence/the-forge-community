/**
 * Slack Integration Service
 *
 * Enterprise-grade Slack API integration for The Forge.
 * Handles OAuth, workspace connection, and intelligent notifications.
 *
 * @author Claude Code
 * @version 1.0.0
 */


const SLACK_API_BASE = 'https://slack.com/api';
const SLACK_DEFAULT_TIMEOUT_MS = 10000;
const SLACK_MAX_RETRIES = 2;
const SLACK_RETRYABLE_ERRORS = new Set([
  'ratelimited',
  'internal_error',
  'timeout',
  'service_unavailable',
]);

export class SlackApiError extends Error {
  code: string;
  status?: number;
  retryable: boolean;
  retryAfterMs?: number;

  constructor(
    message: string,
    code: string,
    options?: { status?: number; retryable?: boolean; retryAfterMs?: number }
  ) {
    super(message);
    this.name = 'SlackApiError';
    this.code = code;
    this.status = options?.status;
    this.retryable = options?.retryable ?? false;
    this.retryAfterMs = options?.retryAfterMs;
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function slackRequest<T>(
  path: string,
  options: {
    accessToken?: string;
    method?: 'GET' | 'POST';
    params?: Record<string, string | undefined>;
    body?: Record<string, unknown> | URLSearchParams;
    timeoutMs?: number;
    retries?: number;
  }
): Promise<T> {
  const {
    accessToken,
    method = 'GET',
    params,
    body,
    timeoutMs = SLACK_DEFAULT_TIMEOUT_MS,
    retries = SLACK_MAX_RETRIES,
  } = options;

  const url = new URL(`${SLACK_API_BASE}/${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      }
    });
  }

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let payload: BodyInit | undefined;
  if (body instanceof URLSearchParams) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    payload = body;
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: payload,
        signal: controller.signal,
      });

      if (response.status === 429) {
        const retryAfterSeconds = Number(response.headers.get('retry-after') || '1');
        const retryAfterMs = Math.max(1, retryAfterSeconds) * 1000;
        if (attempt < retries) {
          await sleep(retryAfterMs);
          continue;
        }
        throw new SlackApiError(
          'Slack rate limit exceeded',
          'ratelimited',
          { status: response.status, retryable: true, retryAfterMs }
        );
      }

      const data = await response.json();

      if (!response.ok || data.ok === false) {
        const errorCode = data.error || `http_${response.status}`;
        const retryable =
          response.status >= 500 || SLACK_RETRYABLE_ERRORS.has(errorCode);
        if (retryable && attempt < retries) {
          const backoff = Math.min(1000 * Math.pow(2, attempt), 4000);
          await sleep(backoff);
          continue;
        }
        throw new SlackApiError(
          `Slack API error: ${errorCode}`,
          errorCode,
          { status: response.status, retryable }
        );
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeout);
      if (attempt < retries && !(error instanceof SlackApiError)) {
        const backoff = Math.min(1000 * Math.pow(2, attempt), 4000);
        await sleep(backoff);
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new SlackApiError('Slack API request failed', 'unknown');
}

// ============================================
// OAuth Token Exchange
// ============================================

export interface SlackTokenResponse {
  ok: boolean;
  access_token: string;
  token_type: string;
  scope: string;
  bot_user_id: string;
  app_id: string;
  team: {
    id: string;
    name: string;
  };
  enterprise?: {
    id: string;
    name: string;
  } | null;
  authed_user: {
    id: string;
    scope: string;
    access_token: string;
    token_type: string;
  };
  error?: string;
}

export async function exchangeSlackCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<SlackTokenResponse> {
  const data = await slackRequest<SlackTokenResponse>('oauth.v2.access', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
    retries: 0,
  });

  return data;
}

// ============================================
// Workspace Info
// ============================================

export interface SlackWorkspaceInfo {
  id: string;
  name: string;
  enterpriseId?: string;
  enterpriseName?: string;
  botUserId: string;
}

export async function getSlackWorkspaceInfo(
  accessToken: string
): Promise<SlackWorkspaceInfo> {
  const data = await slackRequest<{ team: { id: string; name: string; enterprise_id?: string; enterprise_name?: string } }>(
    'team.info',
    { accessToken }
  );

  // Also get auth info to get bot user ID
  const authData = await slackRequest<{ user_id: string }>('auth.test', { accessToken });

  return {
    id: data.team.id,
    name: data.team.name,
    enterpriseId: data.team.enterprise_id,
    enterpriseName: data.team.enterprise_name,
    botUserId: authData.user_id,
  };
}

// ============================================
// Channel Operations
// ============================================

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  num_members: number;
  topic?: string;
  purpose?: string;
}

export async function listChannels(
  accessToken: string,
  types: string = 'public_channel,private_channel'
): Promise<SlackChannel[]> {
  const channels: SlackChannel[] = [];
  let cursor: string | undefined;

  do {
    const data = await slackRequest<{
      channels: any[];
      response_metadata?: { next_cursor?: string };
    }>('conversations.list', {
      accessToken,
      params: {
        types,
        exclude_archived: 'true',
        limit: '200',
        cursor,
      },
    });

    channels.push(
      ...data.channels.map((channel: any) => ({
        id: channel.id,
        name: channel.name,
        is_private: channel.is_private,
        num_members: channel.num_members || 0,
        topic: channel.topic?.value,
        purpose: channel.purpose?.value,
      }))
    );

    cursor = data.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return channels;
}

// ============================================
// User Operations
// ============================================

export interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  email?: string;
  avatar_url?: string;
  is_admin: boolean;
  is_owner: boolean;
  is_bot: boolean;
}

export async function listUsers(
  accessToken: string
): Promise<SlackUser[]> {
  const users: SlackUser[] = [];
  let cursor: string | undefined;

  do {
    const data = await slackRequest<{
      members: any[];
      response_metadata?: { next_cursor?: string };
    }>('users.list', {
      accessToken,
      params: {
        limit: '200',
        cursor,
      },
    });

    users.push(
      ...data.members
        .filter((member: any) => !member.deleted && !member.is_bot)
        .map((member: any) => ({
          id: member.id,
          name: member.name,
          real_name: member.real_name || member.name,
          email: member.profile?.email,
          avatar_url: member.profile?.image_512,
          is_admin: member.is_admin || false,
          is_owner: member.is_owner || false,
          is_bot: member.is_bot || false,
        }))
    );

    cursor = data.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return users;
}

// ============================================
// Messaging
// ============================================

export interface SlackMessageBlock {
  type: 'header' | 'section' | 'divider' | 'actions' | 'context';
  text?: {
    type: 'plain_text' | 'mrkdwn';
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: 'mrkdwn';
    text: string;
  }>;
  elements?: Array<
    | {
        type: 'button';
        text: {
          type: 'plain_text';
          text: string;
        };
        url: string;
        style?: 'primary' | 'danger';
      }
    | {
        type: 'mrkdwn';
        text: string;
      }
    | {
        type: 'plain_text';
        text: string;
        emoji?: boolean;
      }
  >;
}

export interface SlackNotification {
  channel: string;
  text?: string;
  blocks?: SlackMessageBlock[];
  thread_ts?: string;
  unfurl_links?: boolean;
}

export async function sendMessage(
  accessToken: string,
  notification: SlackNotification
): Promise<{ ok: boolean; ts?: string; channel?: string; error?: string }> {
  try {
    const data = await slackRequest<{ ok: boolean; ts?: string; channel?: string }>(
      'chat.postMessage',
      {
        accessToken,
        method: 'POST',
        body: {
          channel: notification.channel,
          text: notification.text || 'Notification from The Forge',
          blocks: notification.blocks,
          thread_ts: notification.thread_ts,
          unfurl_links: notification.unfurl_links ?? true,
        },
      }
    );

    return data;
  } catch (error) {
    if (error instanceof SlackApiError) {
      return { ok: false, error: error.code };
    }
    throw error;
  }
}

// ============================================
// Pre-built Notification Templates
// ============================================

export const SlackTemplates = {
  /**
   * New Venture Created
   */
  ventureCreated: (params: {
    ventureName: string;
    founderName: string;
    ventureUrl: string;
    description?: string;
  }): SlackMessageBlock[] => [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🚀 New Venture Launched',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${params.ventureName}*\nFounded by ${params.founderName}`,
      },
    },
    ...(params.description ? [{
      type: 'section' as const,
      text: {
        type: 'mrkdwn' as const,
        text: params.description,
      },
    }] : []),
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Venture',
          },
          url: params.ventureUrl,
          style: 'primary',
        },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: 'Powered by The Forge ⚡',
        },
      ],
    },
  ],

  /**
   * Squad Member Joined
   */
  squadMemberJoined: (params: {
    ventureName: string;
    memberName: string;
    role: string;
    ventureUrl: string;
  }): SlackMessageBlock[] => [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '👋 New Squad Member',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${params.memberName}* joined *${params.ventureName}*\nRole: ${params.role}`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Squad',
          },
          url: params.ventureUrl,
          style: 'primary',
        },
      ],
    },
  ],

  /**
   * Decision Made
   */
  decisionMade: (params: {
    ventureName: string;
    decisionTitle: string;
    decisionUrl: string;
    votesFor: number;
    votesAgainst: number;
  }): SlackMessageBlock[] => [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '✅ Decision Finalized',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${params.decisionTitle}*\nIn: ${params.ventureName}`,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*For:* ${params.votesFor} votes`,
        },
        {
          type: 'mrkdwn',
          text: `*Against:* ${params.votesAgainst} votes`,
        },
      ],
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Decision',
          },
          url: params.decisionUrl,
          style: 'primary',
        },
      ],
    },
  ],

  /**
   * Task Completed
   */
  taskCompleted: (params: {
    ventureName: string;
    taskTitle: string;
    completedBy: string;
    roadmapUrl: string;
  }): SlackMessageBlock[] => [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '✅ Task Completed',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${params.taskTitle}* completed by ${params.completedBy}\nIn: ${params.ventureName}`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Roadmap',
          },
          url: params.roadmapUrl,
          style: 'primary',
        },
      ],
    },
  ],

  /**
   * Forum Activity
   */
  forumActivity: (params: {
    postTitle: string;
    authorName: string;
    category: string;
    replyCount: number;
    postUrl: string;
  }): SlackMessageBlock[] => [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '💬 Forum Activity',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${params.postTitle}* by ${params.authorName}\nCategory: ${params.category} | ${params.replyCount} replies`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Join Discussion',
          },
          url: params.postUrl,
          style: 'primary',
        },
      ],
    },
  ],

  /**
   * Marketing Content Generated
   */
  marketingGenerated: (params: {
    ventureName: string;
    contentType: 'image' | 'video' | 'avatar';
    generatedBy: string;
    previewUrl?: string;
    studioUrl: string;
  }): SlackMessageBlock[] => [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: params.contentType === 'video' ? '🎬 Video Generated' : params.contentType === 'avatar' ? '👤 Avatar Created' : '🖼️ Image Generated',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `New ${params.contentType} for *${params.ventureName}*\nCreated by: ${params.generatedBy}`,
      },
    },
    ...(params.previewUrl ? [{
      type: 'section' as const,
      text: {
        type: 'mrkdwn' as const,
        text: `<${params.previewUrl}|View Preview>`,
      },
    }] : []),
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Open Studio',
          },
          url: params.studioUrl,
          style: 'primary',
        },
      ],
    },
  ],

  /**
   * Supplier Update
   */
  supplierUpdate: (params: {
    ventureName: string;
    supplierName: string;
    status: 'sample_ordered' | 'sample_received' | 'order_placed' | 'shipped';
    sourcingUrl: string;
  }): SlackMessageBlock[] => {
    const statusEmoji: Record<string, string> = {
      sample_ordered: '📦',
      sample_received: '✅',
      order_placed: '🛒',
      shipped: '🚚',
    };

    const statusText: Record<string, string> = {
      sample_ordered: 'Sample Ordered',
      sample_received: 'Sample Received',
      order_placed: 'Order Placed',
      shipped: 'Order Shipped',
    };

    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji[params.status]} ${statusText[params.status]}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${params.supplierName}*\nFor: ${params.ventureName}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Sourcing',
            },
            url: params.sourcingUrl,
            style: 'primary',
          },
        ],
      },
    ];
  },
};

// ============================================
// Smart Notification Routing
// ============================================

export interface NotificationPreferences {
  ventureCreated: boolean;
  squadMemberJoined: boolean;
  decisionMade: boolean;
  taskCompleted: boolean;
  forumActivity: boolean;
  marketingGenerated: boolean;
  supplierUpdate: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
}

export const defaultPreferences: NotificationPreferences = {
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

// ============================================
// Token Refresh (Slack tokens don't expire but good to have)
// ============================================

export async function refreshSlackToken(
): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date }> {
  // Slack OAuth v2 tokens don't expire by default
  // But if using rotating refresh tokens, implement here
  throw new Error('Slack tokens do not expire');
}

// ============================================
// Bot Installation Check
// ============================================

export async function validateBotAccess(
  accessToken: string
): Promise<{ valid: boolean; error?: string }> {
  const response = await fetch(`${SLACK_API_BASE}/auth.test`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  return {
    valid: data.ok,
    error: data.error,
  };
}
