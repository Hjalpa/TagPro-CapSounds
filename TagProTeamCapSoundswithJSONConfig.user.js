// ==UserScript==
// @name          TagPro Team CapSounds with JSON Config
// @description   Plays a specific sound based on the capping team's name, configured via JSON.
// @include       https://tagpro*.koalabeast.com/game
// @include       https://tagpro*.koalabeast.com/game?*
// @include       https://bash-tp.github.io/tagpro-vcr/*
// @author        Poeticalto, Hjalpa
// @updateURL     https://github.com/Hjalpa/TagPro-CapSounds/raw/refs/heads/main/TagProTeamCapSoundswithJSONConfig.user.js
// @downloadURL   https://github.com/Hjalpa/TagPro-CapSounds/raw/refs/heads/main/TagProTeamCapSoundswithJSONConfig.user.js
// @version       1.3
// ==/UserScript==

/* globals tagpro */

// --- Configuration ---
const JSON_URL = "https://raw.githubusercontent.com/hjalpa/sounds/main/teamcapsounds.json";
const DEFAULT_SOUND_VOLUME = 1.0; // Volume if not specified in JSON (0.0 to 1.0)
// --- End Configuration ---

let teamSoundData = {}; // To store loaded sound data from JSON
let playerCapTrack = {}; // To track caps per player

function fetchAndLoadTeamSoundData() {
    if (!JSON_URL) {
        console.warn("Team CapSounds: JSON_URL is not configured (empty). Please set it in the script.");
        return;
    }
    // Example of how to check for a placeholder if you had one:
    // const PLACEHOLDER_URL = "YOUR_JSON_URL_HERE_REPLACE_ME";
    // if (JSON_URL === PLACEHOLDER_URL) {
    //     console.warn("Team CapSounds: JSON_URL is still the default placeholder. Please update it.");
    //     return;
    // }

    console.log("Team CapSounds: Attempting to fetch JSON from:", JSON_URL);
    fetch(JSON_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status} when fetching ${JSON_URL}`);
            }
            return response.json();
        })
        .then(data => {
            teamSoundData = data;
            console.log("Team CapSounds: Sound data loaded successfully:", JSON.stringify(teamSoundData));
        })
        .catch(error => {
            console.error("Team CapSounds: Failed to load sound data from JSON:", error);
            teamSoundData = {}; // Fallback to empty if load fails
        });
}

tagpro.ready(function() {
    fetchAndLoadTeamSoundData();

    for (let playerId in tagpro.players) {
        if (tagpro.players.hasOwnProperty(playerId)) {
            playerCapTrack[playerId] = tagpro.players[playerId]["s-captures"];
        }
    }

    const teamCapAudio = document.createElement('audio');
    teamCapAudio.preload = "auto";

    tagpro.socket.on("score", function(scoreData) {
        if (tagpro.state !== 5 && tagpro.state === 1) { // Game active
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
                console.log("Team CapSounds: Score event - in setTimeout. teamSoundData keys:", Object.keys(teamSoundData).length);

                if (Object.keys(teamSoundData).length === 0) {
                    console.log("Team CapSounds: Exiting: No sound data loaded (teamSoundData is empty).");
                    return;
                }

                if (!tagpro.teamNames || typeof tagpro.teamNames.redTeamName !== 'string' || typeof tagpro.teamNames.blueTeamName !== 'string') {
                    console.log("Team CapSounds: Exiting: tagpro.teamNames not ready. Red:", tagpro.teamNames ? tagpro.teamNames.redTeamName : 'N/A', "Blue:", tagpro.teamNames ? tagpro.teamNames.blueTeamName : 'N/A');
                    return;
                }
                console.log("Team CapSounds: Using team names - Red:", tagpro.teamNames.redTeamName, "Blue:", tagpro.teamNames.blueTeamName);

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
                             console.log("Team CapSounds: Cap detected by player ID:", playerId, "Team ID:", player.team);

                            if (!teamCapAudio.paused) {
                                teamCapAudio.pause();
                                teamCapAudio.currentTime = 0;
                            }

                            const capperTeamId = player.team;
                            let capperTeamName = "";
                            let fallbackTeamKey = "";

                            if (capperTeamId === 1) {
                                capperTeamName = tagpro.teamNames.redTeamName;
                                fallbackTeamKey = "Red";
                            } else if (capperTeamId === 2) {
                                capperTeamName = tagpro.teamNames.blueTeamName;
                                fallbackTeamKey = "Blue";
                            } else {
                                console.warn("Team CapSounds: Capper's team ID is not 1 or 2:", capperTeamId);
                                capperFound = true;
                                break;
                            }
                            console.log(`Team CapSounds: Capper team name for lookup: '${capperTeamName}', Fallback key: '${fallbackTeamKey}'`);

                            let soundEntry = teamSoundData[capperTeamName] || teamSoundData[fallbackTeamKey];
                            console.log("Team CapSounds: Sound entry found from JSON:", soundEntry);

                            if (soundEntry && typeof soundEntry[0] === 'string') {
                                const soundURL = soundEntry[0];
                                const soundVolume = (soundEntry.length > 1 && typeof soundEntry[1] === 'number') ? soundEntry[1] : DEFAULT_SOUND_VOLUME;
                                console.log(`Team CapSounds: Valid soundEntry. Playing src: ${soundURL}, volume: ${soundVolume}`);

                                teamCapAudio.src = soundURL;
                                teamCapAudio.volume = soundVolume;
                                teamCapAudio.play().catch(e => console.error("Team CapSounds: Error playing sound for", capperTeamName, ":", e, "URL:", soundURL));
                                console.log(`Team CapSounds: Play command issued for team '${capperTeamName}'.`);
                            } else {
                                console.log(`Team CapSounds: No valid soundEntry in JSON. capperTeamName: '${capperTeamName}', fallbackTeamKey: '${fallbackTeamKey}', actual soundEntry was:`, soundEntry);
                            }

                            capperFound = true;
                            break;
                        }
                    }
                }

                for (let playerId in tagpro.players) {
                    if (tagpro.players.hasOwnProperty(playerId) && !(playerId in playerCapTrack)) {
                         playerCapTrack[playerId] = tagpro.players[playerId]["s-captures"];
                    }
                }
            }, waitTimeout);
        }
    });

    tagpro.socket.on("playerLeft", function(playerId) {
        if (playerCapTrack.hasOwnProperty(playerId)) {
            delete playerCapTrack[playerId];
        }
    });
});
