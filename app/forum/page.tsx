import ForumClient from './ForumClient';
export default function ForumPage() {
  return (
    <ForumClient
      initialPosts={[]}
      initialUser={null}
      forumVentureId={null}
    />
  );
}
