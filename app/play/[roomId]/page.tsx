import GameClient from "./GameClient";

type PageProps = {
  params: Promise<{ roomId: string }>;
};

export default async function GameRoomPage({ params }: PageProps) {
  const { roomId } = await params;

  if (!roomId) {
    return <main>Missing room ID.</main>;
  }

  return (
    <main>
      <GameClient roomId={roomId} />
    </main>
  );
}
