export const FORUM_VENTURE_NAME = 'Forum Images';
export const FORUM_VENTURE_DESCRIPTION = '[system] forum images';
export const FORUM_MEDIA_TAG = 'forum';

export const isForumVenture = (venture: { name?: string | null; description?: string | null }) =>
  venture?.description === FORUM_VENTURE_DESCRIPTION || venture?.name === FORUM_VENTURE_NAME;
