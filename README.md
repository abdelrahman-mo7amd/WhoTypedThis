
<p align="center">
    <img src='./assets/banner.png' alt='WhoTypedThis Banner' width="100%">
</p>

# 🎭 Who Typed This? v2.0 is alive and making friendships questionable
<p align="center">
  <img src="https://img.shields.io/badge/version-v2.0-ffb703?style=for-the-badge">
</p>

### multiplayer typing game where friends compete, lie, and slowly lose trust in each other.

Live demo: [https://whotypedthis-f9704.web.app/](https://whotypedthis-f9704.web.app/)

---

## How it works

1. everyone types a message to a friend in the room anonymously
2. everyone tries to guess who wrote each message
3. accusations begin immediately, usually wrong
4. repeat until someone logs off “for no reason”

---

## Gameplay example
Write message about Ahmed: 
> “He is still using Internet Explorer.”

What happens next:

* Ahmed denies everything too aggressively
* Sarah takes it personally
* Someone votes based on vibes
* One player suddenly becomes silent for the rest of the match

This is normal behavior.

---

## Features
### Multiplayer rooms

Create a room, invite friends, or accidentally invite enemies.
Both lead to the same outcome.

### Firebase-powered reality

* Authentication via Firebase Auth
* Real-time syncing with Firestore
* Live updates faster than your friendships recover

### Leaderboard system

Earn points by:

* Guessing correctly (rare skill)
* Convincing everyone you didn’t type that (art form)
* Acting suspicious for no reason (natural talent)

---

## Screenshots

| Signin/Signup/Guest Page  | Create / Join Room          |
| ----------------------- | --------------------------- |
| ![](assets/signin.png) | ![](assets/create.png) |

|  Profile                 | Room Lobby             |
| --------------------------- | -------------------------- |
| ![](assets/profile.png) | ![](assets/room.png) |

| Write Prompt                 | Voting Phase                 |
| ---------------------------- | ---------------------------- |
| ![](assets/writing.png) | ![](assets/voting.png) |

| Scores and Results           |  Home                 |
| -------------------------- | ------------------------------- |
| ![](assets/scores.png) | ![](assets/home.png) |

---

## Tech stack

* Frontend: Vanilla JS, HTML, CSS
* Backend: Firebase

  * firestore (real-time brain damage sync)
  * authentication (who even are you?)
  * hosting

---

## Project structure

```
.
├── assets/
├── css/
├── js/
├── index.html
├── firebase.json
├── firestore.rules
└── README.md
```

---

## How to play

1. open the game
2. sign in, sign up, or enter as guest
3. create or join a room
4. wait for players
5. start round
6. everyone submits something suspicious
7. everyone votes emotionally
8. score is calculated

---

## Installation
You can play through: https://whotypedthis-f9704.web.app/

Or colne the repo:

```bash
git clone https://github.com/abdelrahman-mo7amd/WhoTypedThis.git
cd WhoTypedThis
```

---

## Run locally

```bash
python3 -m http.server 8080
```

---

## Contributing

If you want to contribute:

1. Fork it
2. Break something
3. Fix it
4. Submit a PR explaining why it broke in the first place

---

## License

MIT License

Meaning:
you can use it,
modify it,
and probably create even more chaos.




<p align="center">
  <b>WhoTypedThis?</b><br>
  Guess. Laugh. Regret.
</p>
