# kilo-cc-plugin (or whatever you want to call it)

hey there. so, you like claude code but sometimes you wish it had a bit more... kilo? well, now it does.

this is a little bridge we built so you can use kilo's big-brain features—like reviews, debugging, and just generally delegating the hard stuff—without ever leaving your terminal. it's basically giving claude a kilo-flavored personal assistant.

## what's in the box?

we've got some lowercase slash commands for you (because shouting is rude):

- `/kilo:setup` — basically "is this thing on?" (it checks your kilo cli and auth).
- `/kilo:review` — "hey kilo, did i break anything?" runs a review on your committed changes.
- `/kilo:review-uncommitted` — "review my messy desk" (reviews staged/unstaged changes).
- `/kilo:debug` — "i have no idea why this is failing" delegates the head-scratching to kilo.
- `/kilo:run` — "just do it" hands a whole task to kilo in auto mode.
- `/kilo:status` — "are we there yet?" checks on your background kilo jobs.
- `/kilo:result` — "show me what you got" fetches the final output from kilo.
- `/kilo:cancel` — "abort mission!" kills a running kilo job.
- `/kilo:models` — "what's on the menu?" lists your ai models.
- `/kilo:pr` — "review this PR please" (takes a number, gives a review).

## how to get started (the easy way)

1. you need the [kilo cli](https://kilo.ai/docs/code-with-ai/platforms/cli) installed. if you don't have it, `npm install -g @kilocode/cli` is your friend.
2. make sure you've run `kilo auth` or `/connect` somewhere so kilo knows who you are.
3. add the marketplace in claude code:
   ```
   /plugin marketplace add https://raw.githubusercontent.com/httpparam/kilo-cc-plugin/main/.claude-plugin/marketplace.json
   ```
4. then install the plugin:
   ```
   /plugin install kilo
   ```
5. type `/kilo:setup` and follow the vibes.

if you prefer to install from a local folder:
```bash
claude --plugin-dir /path/to/this/repo
```

## why?

because sometimes you want to work on three things at once, and kilo is really good at the boring bits while you stay in flow. plus, it makes claude feel more like a team.

## license

apache-2.0. go wild.
