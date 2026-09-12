# IT Path Navigator

BUILD IT PATH — FOUNDATION ONLY

Create a completely new application called "IT PATH".

IT PATH is a serious two-year IT education platform for a beginner progressing toward professional IT and cybersecurity roles.

IMPORTANT:

This is a real functional application, not a UI mockup.

Do not build the entire application yet.

Build ONLY the application foundation in this step.

==================================================

TECHNICAL DIRECTION

==================================================

Use Lovable's standard reliable application architecture.

Use:

- React

- TypeScript

- modern component architecture

- responsive design

- LocalStorage for initial user-data persistence

Do not add a backend yet.

Do not add authentication yet.

Do not add an AI API yet.

Do not add unnecessary third-party services.

Keep the architecture modular so a backend can be added later without rewriting the application.

==================================================

NAVIGATION

==================================================

Create working navigation for:

Dashboard

My Path

This Week

Learn

Resources

Assignments

Labs

Quiz Me

Troubleshoot

Career Mode

Review

Certifications

Career Skills

Portfolio

AI Tutor

Progress

Settings

Every navigation item must actually route to a functional page.

Do not create dead buttons.

Do not use "Coming Soon".

==================================================

DESIGN

==================================================

Create a professional dark IT/cybersecurity education interface.

Style:

Dark charcoal/navy

Readable light text

Subtle accent color

Rounded cards

Clean typography

Minimal clutter

Professional rather than flashy

Responsive desktop/tablet/mobile layout

Use a persistent sidebar on desktop and an appropriate mobile navigation pattern.

Do not overuse gradients, glowing effects, or decorative elements.

==================================================

APPLICATION STATE

==================================================

Create a centralized application state architecture.

Separate:

STATIC DATA

from

USER DATA

Static data includes:

curriculum

topics

lessons

resources

assignments

labs

questions

certification objectives

User data includes:

progress

quiz attempts

mistakes

reviews

notes

bookmarks

lab attempts

assignment attempts

portfolio

career scores

settings

study sessions

Do not mix static curriculum with user progress.

==================================================

LOCAL STORAGE

==================================================

Create a reliable persistence layer.

The application must:

Load saved state when opened.

Save user changes automatically.

Survive browser refresh.

Handle missing LocalStorage data.

Handle corrupted LocalStorage data safely.

Create an application data version.

Example:

APP_DATA_VERSION = 1

==================================================

ZERO STATE

==================================================

A new user must start with:

0 completed topics

0 mastered topics

0 assignments completed

0 labs completed

0 quiz attempts

0 study time

0 mistakes

0 reviews

0 bookmarks

0 portfolio projects

0 career tickets completed

Do NOT create fake progress.

Do NOT create fake statistics.

==================================================

SETTINGS

==================================================

Create the Settings page with:

Study hours/week

Study days

Session length

Experience level

Target job

Certification target

Difficulty

Make these actual working controls.

Save them to LocalStorage.

==================================================

DIAGNOSTIC FOUNDATION

==================================================

Add a basic Settings → System Diagnostics section.

Initially test:

Application loads

Navigation works

LocalStorage works

State loads

State saves

Settings save

Show real PASS/FAIL results.

Do not claim PASS without actually testing.

==================================================

IMPORTANT

==================================================

Do NOT build:

curriculum

quiz engine

labs

career mode

certifications

AI tutor

portfolio

troubleshooting

yet.

This step is ONLY the foundation.

Before finishing, test the application.

Fix any errors.

Do not simply describe what you built.

Actually implement it.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://itpath-builder.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c57050b9-5e1b-487d-b747-1efe1d115881).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
