// ==UserScript==
// @name          TagPro CapSounds
// @description   Plays a desired sound when a specific player caps the flag
// @include       https://tagpro*.koalabeast.com/game
// @include       https://tagpro*.koalabeast.com/game?*
// @include       https://bash-tp.github.io/tagpro-vcr/*
// @include       https://*.parretlabs.xyz/flagtag/
// @updateURL     https://github.com/Hjalpa/TagPro-CapSounds/raw/refs/heads/main/capsounds.user.js
// @downloadURL   https://github.com/Hjalpa/TagPro-CapSounds/raw/refs/heads/main/capsounds.user.js
// @author        Poeticalto, Hjalpa
// @version       1.02
// ==/UserScript==

/* globals tagpro, PIXI */
/* eslint-env jquery */
/* eslint-disable no-multi-spaces */
/* eslint-disable no-loop-func */

// URL of your JSON file on GitHub
const JSON_URL = "https://raw.githubusercontent.com/hjalpa/sounds/main/capsounds.json"; // Replace with your actual URL
let playerData;
let originalMusicVolume = 1;
const FADE_DURATION = 200;
const MIN_VOLUME = 0.2;
let soundPlaying = false;

tagpro.ready(function () {
    let dummyPlayers = {};
    for (let x in tagpro.players) {
        dummyPlayers[tagpro.players[x].name] = 0;
    }
    const playerSound = document.createElement('audio');
    playerSound.preload = "auto";

    function fetchAndLoadPlayerData() {
        fetch(JSON_URL)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                playerData = data;
                console.log("Player sound data loaded successfully from json file:", playerData);
            })
            .catch(error => {
                console.error("Failed to load player sound data from JSON:", error);
                playerData = {};
            });
    }

    fetchAndLoadPlayerData();

    function fadeOutMusic(musicElement) {
        let start = null;
        const originalVolume = musicElement.volume;

        function step(timestamp) {
            if (!start) {
                start = timestamp;
            }
            const progress = timestamp - start;
            musicElement.volume = Math.max(MIN_VOLUME, originalVolume * (1 - progress / FADE_DURATION));

            if (progress < FADE_DURATION) {
                requestAnimationFrame(step);
            } else {
                musicElement.volume = MIN_VOLUME;
            }
        }
        requestAnimationFrame(step);
    }

    function fadeInMusic(musicElement, originalVolume) {
        let start = null;

        function step(timestamp) {
            if (!start) {
                start = timestamp;
            }
            const progress = timestamp - start;
            musicElement.volume = Math.min(originalVolume, MIN_VOLUME + (progress / FADE_DURATION) * (originalVolume - MIN_VOLUME));

            if (progress < FADE_DURATION) {
                requestAnimationFrame(step);
            } else {
                musicElement.volume = originalVolume;
            }
        }

        requestAnimationFrame(step);
    }

    tagpro.socket.on("score", function (message) {
        if (tagpro.state !== 5) {
            document.getElementById("cheering").pause();
            document.getElementById("cheering").currentTime = 0;
            document.getElementById("sigh").pause();
            document.getElementById("sigh").currentTime = 0;

            let musicElement = document.getElementById("music");
            if (musicElement) {
                originalMusicVolume = musicElement.volume;
                fadeOutMusic(musicElement);
            }


            let waitTimeout = tagpro.ping.avg + 30;
        window.setTimeout(function () {
           for (let x in tagpro.players) {
                let pName = tagpro.players[x].name;
                let pCaps = tagpro.players[x]["s-captures"];
                 if (!(pName in dummyPlayers)) {
                    dummyPlayers[pName] = 0;
                    continue;
                }
                if (dummyPlayers[pName] !== pCaps) {
                    dummyPlayers[pName] = pCaps;

                    // Stop the currently playing sound if any
                    if (!playerSound.paused) {
                        playerSound.pause();
                        playerSound.currentTime = 0;
                    }


                     //Event listener for when sound is finished.
                    playerSound.addEventListener('ended', function() {
                        soundPlaying = false;
                        if (musicElement) {
                            fadeInMusic(musicElement, originalMusicVolume);
                        }
                 });


                    if (playerData[pName]) {
                         playerSound.src = playerData[pName][0];
                         playerSound.volume = (playerData[pName].length > 1 ? playerData[pName][1] : 1);
                         playerSound.play();
                         soundPlaying = true; // set flag
                    }
                     else if (playerData["some ball"]) {
                        playerSound.src = playerData["some ball"][0];
                        playerSound.volume = (playerData["some ball"].length > 1 ? playerData["some ball"][1] : 1);
                        playerSound.play();
                        soundPlaying = true; // set flag
                     } else
                     {
                            if (musicElement) {
                                  fadeInMusic(musicElement, originalMusicVolume);
                            }
                      }
                  }
               }
             }, waitTimeout);
        }
    });
});

//Zorro!
