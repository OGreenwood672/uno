# Uno Game

This is a real-time multiplayer Uno card game built with Next.js, PartyKit, and TypeScript.

## Features

- Real-time multiplayer gameplay
- Lobby system to join and start games
- Animated card aovements
- Theming support (Classic, Dark Mode, Neon)

## Technologies Used

- **Frontend:** [Next.js](https://nextjs.org/) (React)
- **Real-time Backend:** [PartyKit](https://www.partykit.io/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Animation:** [Framer Motion](https://www.framer.com/motion/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)

## Project Structure

- `app/`: Next.js App Router pages. The main game client is located at `app/play/[roomId]`.
- `components/`: Reusable React components.
- `party/`: PartyKit server-side code (`game-server.ts`).
- `public/`: Static assets.
- `types/`: TypeScript type definitions for the game state and actions.
- `utils/`: Utility functions, such as deck creation.

## How to Run

### Prerequisites

- [Node.js](https://nodejs.org/) (version 20 or later)
- [npm](https://www.npmjs.com/)

### 1. Installation

Clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd uno-game
npm install
```

### 2. Running the Development Servers

You need to run two separate processes in two different terminals.

**Terminal 1: Start the PartyKit Server**

This server handles the real-time game logic.

```bash
npm run party
```

You should see an output similar to this:
```
🎈 partykit dev
starting...
local party server running at http://127.0.0.1:1999
```

**Terminal 2: Start the Next.js Frontend**

This server handles the user interface.

```bash
npm run dev
```

You should see an output similar to this:
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
```

### 3. Playing the Game

1.  Open your browser and navigate to `http://localhost:3000`.
2.  You will be redirected to a new game room with a unique URL like `http://localhost:3000/play/your-room-id`.
3.  Share this URL with a friend.
4.  Enter your name and click "Join Game".
5.  Once at least two players have joined, the "Start Game" button will become enabled.
6.  Click "Start Game" to begin playing!
