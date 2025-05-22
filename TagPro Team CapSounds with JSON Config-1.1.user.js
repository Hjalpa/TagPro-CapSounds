// ==UserScript==
// @name          TagPro Team CapSounds with JSON Config
// @description   Plays a specific sound based on the capping team's name, configured via JSON.
// @include       https://tagpro*.koalabeast.com/game
// @include       https://tagpro*.koalabeast.com/game?*
// @include       https://bash-tp.github.io/tagpro-vcr/*
// @author        Poeticalto, Hjalpa
// @updateURL     https://github.com/Hjalpa/TagPro-CapSounds/raw/refs/heads/main/tbacapsounds.user.js
// @downloadURL   https://github.com/Hjalpa/TagPro-CapSounds/raw/refs/heads/main/tbacapsounds.user.js
// @version       1.1
// ==/UserScript==

/* globals tagpro */

// --- Configuration ---
// !!! REPLACE THIS WITH THE ACTUAL RAW URL TO YOUR JSON FILE !!!
const JSON_URL = "https://raw.githubusercontent.com/hjalpa/sounds/main/teamcapsounds.json";
const DEFAULT_SOUND_VOLUME = 1.0; // Volume if not specified in JSON (0.0 to 1.0)
// --- End Configuration ---

let teamSoundData = {}; // To store loaded sound data from JSON
let playerCapTrack = {}; // To track caps per player

function fetchAndLoadTeamSoundData() {
    if (!JSON_URL || JSON_URL === "https://raw.githubusercontent.com/hjalpa/sounds/main/teamcapsounds.json") {
        console.warn("Team CapSounds: JSON_URL is not configured. Please update the script with your JSON file URL.");
        return;
    }
    fetch(JSON_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status} when fetching ${JSON_URL}`);
            }
            return response.json();
        })
        .then(data => {
            teamSoundData = data;
            console.log("Team CapSounds: Sound data loaded successfully:", teamSoundData);
        })
        .catch(error => {
            console.error("Team CapSounds: Failed to load sound data from JSON:", error);
            teamSoundData = {}; // Fallback to empty if load fails, so script doesn't break
        });
}

tagpro.ready(function() {
    fetchAndLoadTeamSoundData(); // Load the sound data when TagPro is ready

    // Initialize cap counts for players already in the game
    for (let playerId in tagpro.players) {
        if (tagpro.players.hasOwnProperty(playerId)) {
            playerCapTrack[playerId] = tagpro.players[playerId]["s-captures"];
        }
    }

    // Audio element to play the team cap sounds
    const teamCapAudio = document.createElement('audio');
    teamCapAudio.preload = "auto";

    tagpro.socket.on("score", function(scoreData) {
        // We only care about actual game state (state 1).
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

            const waitTimeout = (tagpro.ping.avg || 50) + 30;

            window.setTimeout(function() {
                // Ensure teamSoundData and tagpro.teamNames are available
                if (Object.keys(teamSoundData).length === 0) {
                    // console.log("Team CapSounds: No sound data loaded or available yet, skipping sound playback.");
                    return; // Don't proceed if no sound data
                }
                if (!tagpro.teamNames || !tagpro.teamNames.redTeamName || !tagpro.teamNames.blueTeamName) {
                    console.warn("Team CapSounds: tagpro.teamNames not available yet.");
                    return; // Don't proceed if team names aren't set
                }

                let capperFound = false;
                for (let playerId in tagpro.players) {
                    if (tagpro.players.hasOwnProperty(playerId)) {
                        const player = tagpro.players[playerId];
                        const currentCaps = player["s-captures"];

                        if (!(playerId in playerCapTrack)) {
                            playerCapTrack[playerId] = currentCaps;
                            continue;
                        }

                        if (currentCaps > playerCapTrack[playerId]) {
                            playerCapTrack[playerId] = currentCaps;

                            if (!teamCapAudio.paused) {
                                teamCapAudio.pause();
                                teamCapAudio.currentTime = 0;
                            }

                            const capperTeamId = player.team; // 1 for Red, 2 for Blue
                            const actualRedTeamName = tagpro.teamNames.redTeamName;
                            const actualBlueTeamName = tagpro.teamNames.blueTeamName;

                            let soundEntry = null;
                            let teamNameForLookup = "";

                            if (capperTeamId === 1) { // Red team capped
                                teamNameForLookup = actualRedTeamName;
                                soundEntry = teamSoundData[actualRedTeamName] || teamSoundData["Red"]; // Try specific name, then fallback to "Red"
                            } else if (capperTeamId === 2) { // Blue team capped
                                teamNameForLookup = actualBlueTeamName;
                                soundEntry = teamSoundData[actualBlueTeamName] || teamSoundData["Blue"]; // Try specific name, then fallback to "Blue"
                            }

                            if (soundEntry && typeof soundEntry[0] === 'string') {
                                teamCapAudio.src = soundEntry[0];
                                teamCapAudio.volume = (soundEntry.length > 1 && typeof soundEntry[1] === 'number') ? soundEntry[1] : DEFAULT_SOUND_VOLUME;
                                teamCapAudio.play().catch(e => console.error("Team CapSounds: Error playing sound for", teamNameForLookup, ":", e));
                                console.log(`Team CapSounds: Playing sound for cap by team '${teamNameForLookup}'. Sound src: ${soundEntry[0]}`);
                            } else {
                                console.log(`Team CapSounds: No sound configured in JSON for team '${teamNameForLookup}' or its default fallback ('Red'/'Blue').`);
                            }

                            capperFound = true;
                            break; // Exit loop once capper is found
                        }
                    }
                }

                // Update cap counts for any players who might have joined
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