import UserCard from './UserCard';

export default function ChatList({ currentUser }: { currentUser: string }) {
  const users = ['friend@example.com', 'demo@example.com'].filter((u) => u !== currentUser);

  return (
    <aside className="w-64 border-r p-4 space-y-2">
      <h2 className="text-lg font-semibold mb-4">Chats</h2>
      {users.map((user) => (
        <UserCard key={user} email={user} />
      ))}
    </aside>
  );
}