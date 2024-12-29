// ==UserScript==
// @name          TagPro player-specific sounds based on event but with JSON
// @namespace     Poeticalto
// @description   Plays a desired sound when a specific player caps the flag
// @include       https://tagpro*.koalabeast.com/game
// @include       https://tagpro*.koalabeast.com/game?*
// @include       https://bash-tp.github.io/tagpro-vcr/*
// @include       https://*.parretlabs.xyz/flagtag/
// @author        Poeticalto, Hjalpa
// @version       1.00
// ==/UserScript==

/* globals tagpro, PIXI */
/* eslint-env jquery */
/* eslint-disable no-multi-spaces */
/* eslint-disable no-loop-func */

// URL of your JSON file on GitHub
const JSON_URL = "https://raw.githubusercontent.com/hjalpa/sounds/main/capsounds.json"; // Replace with your actual URL
let playerData; // Define playerData here so it can be used in the function
let originalMusicVolume = 1;
const FADE_DURATION = 200; // Fade duration in milliseconds
const MIN_VOLUME = 0.2; // Minimum volume during the fade
const TIMEOUT_DURATION = 10000; // Timeout duration in milliseconds (10 seconds)
let musicTimeout; // timeout variable to clear on success

tagpro.ready(function(){
    // dummy object for comparing number of caps
    let dummyPlayers = {};
    for (let x in tagpro.players) {
        dummyPlayers[tagpro.players[x].name] = 0;
    }
    // element holding sound to play
    const playerSound = document.createElement('audio');
    playerSound.preload = "auto";

    // Function to fetch and load player sounds from JSON
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
                // Handle the error, maybe use default sounds or display a message
                playerData = {};
            });
    }

    fetchAndLoadPlayerData();


    function fadeOutMusic(musicElement)
    {
        let start = null;
        const originalVolume = musicElement.volume;

         function step(timestamp)
        {
            if (!start) {
              start = timestamp;
            }
           const progress = timestamp - start;
          // Use Math.max to calculate the volume with a minimum of MIN_VOLUME
           musicElement.volume = Math.max(MIN_VOLUME, originalVolume * (1 - progress / FADE_DURATION) );


            if (progress < FADE_DURATION)
            {
              requestAnimationFrame(step);
            }
             else {
                musicElement.volume = MIN_VOLUME;
            }
        }
       requestAnimationFrame(step);
    }

    function fadeInMusic(musicElement, originalVolume)
    {
        let start = null;

         function step(timestamp) {
              if (!start) {
                start = timestamp;
              }
              const progress = timestamp - start;
              // Calculate volume from minimum volume to full volume.
              musicElement.volume = Math.min(originalVolume, MIN_VOLUME + (progress / FADE_DURATION) * (originalVolume - MIN_VOLUME) );

            if (progress < FADE_DURATION)
             {
              requestAnimationFrame(step);
             }
             else
             {
              musicElement.volume = originalVolume;
             }
        }

        requestAnimationFrame(step);
    }

    // note that the score event may fire at non-capture times
    // so it is important to handle those "mis-fires" as well
	tagpro.socket.on("score", function(message) {
        if (tagpro.state !== 5) {
        // interrupt the default sound and reset so it doesn't mess up future playback
        document.getElementById("cheering").pause();
        document.getElementById("cheering").currentTime = 0;
        document.getElementById("sigh").pause();
        document.getElementById("sigh").currentTime = 0;

         // Store the original music volume and pause the music
        let musicElement = document.getElementById("music");
        if (musicElement)
        {
           originalMusicVolume = musicElement.volume;
           fadeOutMusic(musicElement);
           // Set a timeout to fade the music in if it is not restored in time
          musicTimeout = setTimeout(function(){
                 if (musicElement.volume <= MIN_VOLUME) {
                       fadeInMusic(musicElement, originalMusicVolume);
                   }
            }, TIMEOUT_DURATION);
        }
        // add timeout before checking tagpro object for changed data
        let waitTimeout = tagpro.ping.avg + 30;
        window.setTimeout( function() {
            for (let x in tagpro.players) {
                // player data to check from tagpro object
                let pName = tagpro.players[x].name;
                let pCaps = tagpro.players[x]["s-captures"];
                if (! (pName in dummyPlayers))
                {
                    dummyPlayers[pName] = 0;
                    continue;
                }
                if (dummyPlayers[pName] !== pCaps)
                {
                    dummyPlayers[pName] = pCaps;
                    // if the playerSound element is currently playing,
                    // stop and reset to play a new sound
                    // Note this behavior can be done in different ways
                    if (!playerSound.paused)
                    {
                        playerSound.pause();
                        playerSound.currentTime = 0;
                    }

                    // check playerData object for the correct sound to play
                    if (playerData[pName])
                    {
                        playerSound.src = playerData[pName][0];
                        playerSound.volume = (playerData[pName].length > 1 ? playerData[pName][1] : 1);
                       // Event listener to reset the game music after the player sound plays
                        playerSound.addEventListener('ended', function() {
                                if (musicElement) {
                                    clearTimeout(musicTimeout);
                                    fadeInMusic(musicElement, originalMusicVolume);
                                }
                             }, { once: true });
                        playerSound.play();
                    }
                    else if (playerData["some ball"])
                    {
                        playerSound.src = playerData["some ball"][0];
                        playerSound.volume = (playerData["some ball"].length > 1 ? playerData["some ball"][1] : 1);
                       // Event listener to reset the game music after the player sound plays
                        playerSound.addEventListener('ended', function() {
                                if (musicElement) {
                                     clearTimeout(musicTimeout);
                                     fadeInMusic(musicElement, originalMusicVolume);
                                }
                             }, { once: true });
                        playerSound.play();
                    }
                     else
                    {
                         if (musicElement) {
                            clearTimeout(musicTimeout);
                            fadeInMusic(musicElement, originalMusicVolume);
                        }
                    }
                }
            }
        }, waitTimeout);
        }});
});

//Zorro!
