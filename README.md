<p align="center">
    <img src="https://d2thvodm3xyo6j.cloudfront.net/media/2020/03/c78780cc94c6419a-600x338.jpg" alt="Spock" />
</p>

<h1 align="center">Spock</h1>

<p align="center"><strong><i>"My mind to your mind, my thoughts to your thoughts."</i></strong></p>

> [!WARNING]
> 🚧 **This is an experimental project** 🚧
>
> Things that exist are probably broken, and if they're not, they might be tomorrow.
>
> Please do get involved; definitely don't rely on it for anything important.

Goal: make greenfield development with coding agents feel telepathic – frictionless and predictable, rather than
repetitive and interminable.

## Who is this for?

People starting a new app from scratch, with a coding agent.

This is intentionally narrow: this project is about improving decision-making during the first few hours of a codebase's
life. Established projects have enough context baked in that the same problems mostly do not arise, and/or would need
different solutions.

## What's the problem?

Coding agents are tuned to deliver as much as possible, as early as possible.

Most of the time this is exactly what you want, and it is a large part of why they are so
compelling to use. At the start of a new project, though, it is precisely the opposite of what you *need*.
That is the moment at which an agent has the least context it will ever have. There is no
schema to conform to, no existing screens to match, and no established way that things are
done. Delivering an engaging experience that gets you over the initial inertia means making assumptions or picking at
random – producing volumes of working code that embody these arbitrary decisions. This gives you what you want, but it
definitely isn't what you need.

## Why this happens: Context Pollution

Agents love making quick calls in order to keep moving, on the understanding it'll be cheap to change later. Which is
entirely true at the point the call is made – it is a placeholder, everybody involved knows it is a
placeholder, and moving on is often the right call.

The problem is that this decision – made with the goal of getting a quick win – gets written into the codebase, where it
becomes indistinguishable from every other line of code – including those that embody decisions that required hours of
agonising discussions and/or research to make.

In the next session/iteration, nobody (and no agent) can tell the two apart. The placeholder and the decision that
was agonised over occupy the same files, in the same shape, asserted with precisely the same
confidence. Neither carries any marker of which it is. The agent reads both as intent –
because from the inside they are indistinguishable from intent – and builds on top of them
accordingly.

**The code is the context. The context is polluted.**

What makes this worth naming, rather than just complaining about, is that it never shows up
anywhere you would think to look. It is not in the diff; each individual change is perfectly
reasonable, reviewable, and does exactly what it says it does. It exists only in the gap
between what was written and what was meant, and that gap only exists in the reams of chat history that are long
compacted into oblivion or discarded altogether.
It also compounds, which is the part that hurts – every subsequent decision gets made on top
of a lossy reading of the earlier ones.

## Why you should care

- **Tokens.** The agent re-derives the same conclusions over and over, works around
  scaffolding it has assumed is load-bearing – or works hard to preserve behaviour you never asked for, and that was
  decided on for the sake of keeping going – and drags the whole polluted history into every
  single request.
- **Time.** Yours, mostly, spent re-litigating decisions that nobody can date or justify –
  including the ones you made yourself.

The big one:

- **Convergence.** If nobody can tell what is a "real", intentional decision, and what was a spur-of-the-moment "good
  enough for now" placeholder, your project will never converge to a state where it feels finished.

## How to Live Long and Prosper

Draw the outlines first. Then colour them in.

Colouring in is the part agents are genuinely, remarkably good at, and it is also the part
that is cheap to throw away and do again. The outlines are neither of those things. The assumption here is that time
spent getting them right at the outset is not overhead: it is
the only work whose cost goes up the longer you leave it.

The bet is that the important decisions all bubble up to one of three things:

- **Wireframes** – what the screens are.
- **UX flows** – how you get between them, and under what conditions.
- **Domain model** – what entities (user, org, project, item) exist for this app, and what the relationship between them
  is.

Conceptually, these are all tightly coupled and therefore constrain each other.

In practice, those constraints only exist in code, which is why engineers are the people who end up pushing back on
product requirements for reasons the PM couldn't predict. This is the same push and pull solo builders face with coding
agents today.

Spock is an attempt to provide a deterministic toolkit for agents to build with that surfaces these constraints early,
and forces the product decisions they entail to be answered before any code gets written.

Outside of hard tech, there is no economic reason for product to need to *negotiate* with eng: it should be product
decides, eng builds. In practice, though, it's always been a two-way street, and AI has not changed that. Coding agents
give product owners the illusion of control. Spock is an attempt to make that control real.

---

## Repo Index

This is a pnpm workspace. Run `pnpm install` at the root, then `pnpm dev` to start the sample app.

`packages/core/` – `@spock/core`: the router. Apps define a typed route tree with data bindings, and use its hooks
(`useData`, `useParams`) and components (`Link`, `Outlet`), addressing routes by name. TanStack Router runs
underneath but isn't part of the API.
The sample app consumes it as TypeScript source; it has no build step.

`apps/sample/` – `@spock/sample`: a React + Vite app built on `@spock/core`, with a route tree, a seeded store,
and demo pages.

Design notes are in `NOTES.md`.

`.archive/` – old work, kept for reference only. It isn't maintained and will be deleted eventually.

- `.archive/hot-mess/` – first stab at demonstrating technical viability (formerly `vibe-prototype/`).
- `.archive/notes/` – planning notes for that first stab (formerly `mindmeld/`).
