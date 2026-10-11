# re-type

A minimal speed typing test. Open `index.html` in a browser and start typing.

## How it works

- The idle screen shows a `Re-type, start typing` chip above the text box.
- Type the first character to start the timer. The chip swaps to live stats (`{WPM}WPM, {s}s left...`).
- Correct characters turn green, wrong ones turn red with a strikethrough. The active character is blue with an underline.
- Text auto-scrolls one full line at a time with a smooth slide. Lines that scroll past the top and bottom edges dissolve under a blur fade.
- Multi-line custom texts are supported. Newlines render as real line breaks with a `⏎` marker, tinted per character state. Press Enter to type a newline.
- When the text is finished or the timer runs out, the text blurs and an overlay shows the final score:

  `Final Score (WPM): {wpm}, Finished in {seconds} seconds`

  `Press Tab to restart`

## Controls

- **Tab** — restart the test. Works in any state: idle, typing, finished, or with a popup open.
- **Clock icon** (top right) — opens a centered popup to change the test duration (10-30 s). The background blurs while the popup is open.
- **Pencil icon** (top right) — opens a centered popup with a textbox to set custom target text, plus a `Change the current text` button that applies the text and closes the popup (slide-down + fade-out).
- **Esc** — unfocus an input field.

## Palette

| Token  | Hex       |
| ------ | --------- |
| Deep   | `#293681` |
| Blue   | `#4274D9` |
| Pale   | `#95CCDD` |
| Mist   | `#D0E7E6` |

Font: SF Pro Display, Bold.

## Files

- `index.html` — markup: prompt chip, icon buttons, typing box, finish overlay, popups.
- `style.css` — theme, animations (slide-up + fade-in), edge fades, popups.
- `script.js` — test lifecycle, rendering, keyboard input, auto-scroll, popups.
- `design-prototype/Page 1.pdf` — original UI/UX mockup (2 pages: idle and typing states).
