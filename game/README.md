# Red's Digital Maze

A 2D pixel-art browser game that teaches players about digital scams.

## How to play
Double-click `index.html` to open it in a browser. You don't need to install anything or run a server.
To share it, copy or upload the whole `game` folder. It also works on any static host, such as GitHub Pages or Netlify.

- **Move:** Arrow keys or WASD, or the on-screen arrow buttons (tap or hold)
- **Answer:** Click or tap an answer button, or press 1–4

## Rules
- Red starts with **SGD 2,000** for Grandma.
- The maze has 8 rooms, and each room's wolf asks questions from that room's CSV only.
- Answer 1 ("don't know"): no money is lost. Red sees the safe choice and gets a new question.
- Answer 2 (correct): the room is cleared and the path opens.
- Answer 3 (half-way): Red loses part of the money. The amount comes from the answer text (for example "$190"), or half the Scam Value if the text has no amount. Red then gets a new question.
- Answer 4 (wrong): Red loses the full Scam Value and gets a new question.
- A Scam Value of `N/A` (personal info or safety questions) costs **SGD 300** for Answer 4 and **SGD 100** for Answer 3. You can change these at the top of `js/game.js` (`INFO_LOSS_FULL`, `INFO_LOSS_PART`).
- Answer buttons are shuffled for every question.
- If the wallet reaches SGD 0, the game is over.

## Editing questions
1. Edit the CSVs in `../Question CSVs/`, keeping the same columns.
2. Run `python game/tools/build_questions.py` from the project root. This regenerates `js/questions.js`.

## Files
- `index.html`, `css/style.css`, `js/game.js`: the game
- `js/questions.js`: question data built from the CSVs
- `assets/`: room backgrounds and character sprites, with backgrounds removed, taken from the reference images
