// ==UserScript==
// @name          TagPro Team CapSounds
// @description   Plays a specific sound when a Team caps the flag. Do not use with the script for individual players.
// @include       https://tagpro*.koalabeast.com/game
// @include       https://tagpro*.koalabeast.com/game?*
// @include       https://bash-tp.github.io/tagpro-vcr/*
// @author        Poeticalto, Hjalpa
// @version       1.0
// ==/UserScript==

/* globals tagpro */

// --- Configuration ---
// Replace these URLs with the actual URLs of your sound files
const redTeamSoundURL = "https://raw.githubusercontent.com/hjalpa/sounds/main/NiplepotamusViking.mp3";
const blueTeamSoundURL = "https://raw.githubusercontent.com/hjalpa/sounds/main/hjalpaletsgo.mp3";

const soundVolume = 1.0; // General volume for the cap sounds (0.0 to 1.0)
// --- End Configuration ---

tagpro.ready(function() {
    // Dummy object for comparing number of caps for each player
    let playerCapTrack = {};

    // Initialize cap counts for players already in the game
    for (let playerId in tagpro.players) {
        if (tagpro.players.hasOwnProperty(playerId)) {
            playerCapTrack[playerId] = tagpro.players[playerId]["s-captures"];
        }
    }

    // Audio element to play the team cap sounds
    const teamCapAudio = document.createElement('audio');
    teamCapAudio.preload = "auto";
    teamCapAudio.volume = soundVolume;

    tagpro.socket.on("score", function(scoreData) {
        // though state 1 (game active) is the primary target.
        if (tagpro.state !== 5 && tagpro.state === 1) {
            // Interrupt the default TagPro cheering/sighing sounds
            const cheeringSound = document.getElementById("cheering");
            if (cheeringSound) {
                cheeringSound.pause();
                cheeringSound.currentTime = 0;
            }
            const sighSound = document.getElementById("sigh");
            if (sighSound) {
                sighSound.pause();
                sighSound.currentTime = 0;
            }

            // Add a short delay to allow TagPro's player stats to update
            // This helps ensure we correctly identify the capper.
            const waitTimeout = (tagpro.ping.avg || 50) + 30; // Use average ping or a default

            window.setTimeout(function() {
                let capperFound = false;
                for (let playerId in tagpro.players) {
                    if (tagpro.players.hasOwnProperty(playerId)) {
                        const player = tagpro.players[playerId];
                        const currentCaps = player["s-captures"];

                        // If player is new to our tracking, initialize their caps
                        if (!(playerId in playerCapTrack)) {
                            playerCapTrack[playerId] = currentCaps;
                            continue; // Skip further processing for this new player on this event
                        }

                        // Check if this player's cap count has increased
                        if (currentCaps > playerCapTrack[playerId]) {
                            playerCapTrack[playerId] = currentCaps; // Update their cap count

                            // Stop any currently playing team cap sound
                            if (!teamCapAudio.paused) {
                                teamCapAudio.pause();
                                teamCapAudio.currentTime = 0;
                            }

                            // Determine which sound to play based on the capper's team
                            if (player.team === 1) { // Team 1 is Red
                                teamCapAudio.src = redTeamSoundURL;
                                console.log("Red team (Team 1) capped. Playing red sound.");
                            } else if (player.team === 2) { // Team 2 is Blue
                                teamCapAudio.src = blueTeamSoundURL;
                                console.log("Blue team (Team 2) capped. Playing blue sound.");
                            } else {
                                console.log("Capper's team is not 1 or 2:", player.team);
                                capperFound = true; // Mark as found but don't play a sound
                                break;
                            }

                            teamCapAudio.play().catch(e => console.error("Error playing team cap sound:", e));
                            capperFound = true;
                            break; // Exit loop once capper is found and sound is triggered
                        }
                    }
                }

                // Update cap counts for any players who might have left and rejoined,
                // or if a player joined and their initial caps were >0 (less common for caps)
                // This also handles players who were not present at script start.
                for (let playerId in tagpro.players) {
                    if (tagpro.players.hasOwnProperty(playerId) && !(playerId in playerCapTrack)) {
                         playerCapTrack[playerId] = tagpro.players[playerId]["s-captures"];
                    }
                }


            }, waitTimeout);
        }
    });

    // Clean up tracking for players who leave
    tagpro.socket.on("playerLeft", function(playerId) {
        if (playerCapTrack.hasOwnProperty(playerId)) {
            delete playerCapTrack[playerId];
        }
    });
});