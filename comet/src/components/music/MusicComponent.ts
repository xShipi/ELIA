import MusicQueue from "./MusicQueue";
import { Message, VoiceChannel } from "discord.js";
import MusicData from "./MusicData";
import MessageComponent from "../core/MessageComponent";
import MusicPlayer from "./MusicPlayer";
import YoutubeService from "./YoutubeService";
import ActivityDisplayComponent from "../core/ActivityDisplayComponent";
import LoggingComponent from "../core/LoggingComponent";
//song command imports
import Command from "../../commands/Command";
import CurrentSongCommand from "../../commands/voice/music/CurrentSongCommand";
import GetQueueCommand from "../../commands/voice/music/GetQueueCommand";
import LeaveCommand from "../../commands/voice/music/LeaveCommand";
import LoopQueueCommand from "../../commands/voice/music/LoopQueueCommand";
import LoopSongCommand from "../../commands/voice/music/LoopSongCommand";
import PauseCommand from "../../commands/voice/music/PauseCommand";
import PlayCommand from "../../commands/voice/music/PlayCommand";
import QueueSongCommand from "../../commands/voice/music/QueueSongCommand";
import RemoveSongFromQueueCommand from "../../commands/voice/music/RemoveSongFromQueueCommand";
import ReplaySongCommand from "../../commands/voice/music/ReplaySongCommand";
import ResumeSongCommand from "../../commands/voice/music/ResumeSongCommand";
import ShuffleQueueCommand from "../../commands/voice/music/ShuffleQueueCommand";
import SkipSongCommand from "../../commands/voice/music/SkipSongCommand";

/**
 * Component for ELIA handles the music commands
 */
export default class MusicComponent {
    /**
     * Gets the music commands in an array
     *
     * @param {PlayCommand} playCommand the play command in the commands, needed for DI, since the play command has DI
     * @param {QueueSongCommand} queueSongCommand  the queue command in the commands, needed for DI, since the play command has DI
     * @returns {Command[]} the array of the command objects
     */
    static getMusicCommands(
        playCommand: PlayCommand,
        queueSongCommand: QueueSongCommand
    ): Command[] {
        return [
            new CurrentSongCommand(),
            new GetQueueCommand(),
            new LeaveCommand(),
            new LoopQueueCommand(),
            new LoopSongCommand(),
            new PauseCommand(),
            playCommand,
            queueSongCommand,
            new RemoveSongFromQueueCommand(),
            new ReplaySongCommand(),
            new ResumeSongCommand(),
            new ShuffleQueueCommand(),
            new SkipSongCommand(),
        ];
    }
    constructor(
        youtubeService: YoutubeService,
        activityDisplayComponent: ActivityDisplayComponent,
        messageComponent: MessageComponent,
        loggingComponent: LoggingComponent,
        musicQueue: MusicQueue,
        musicPlayer: MusicPlayer
    ) {
        this.youtubeService = youtubeService;
        this.activityDisplayComponent = activityDisplayComponent;
        this.messageComponent = messageComponent;
        this.loggingComponent = loggingComponent;
        this.musicQueue = musicQueue;
        this.musicPlayer = musicPlayer;
    }

    // --- Dependencies ---

    /**
     * The service for YouTube
     *
     * @type {YoutubeService}
     */
    private youtubeService: YoutubeService;

    /**
     * The activity component for ELIA
     *
     * @type {ActivityDisplayComponent}
     */
    private activityDisplayComponent: ActivityDisplayComponent;

    /**
     * The message component for ELIA
     *
     * @type {MessageComponent}
     */
    private messageComponent: MessageComponent;

    /**
     * The music queue for the component
     *
     * @type {MusicQueue}
     */
    private musicQueue: MusicQueue;

    /**
     * The music player for the component
     *
     * @type {MusicPlayer}
     */
    private musicPlayer: MusicPlayer;

    /**
     * The logging component for the component
     *
     * @type {LoggingComponent}
     */
    private loggingComponent: LoggingComponent;

    /**
     * Check's if the user who sent the massage has permissions to connect and speak in the channel he/she currently in.
     *
     * @param {Message} message the message which the user sent with valid music command
     * @returns {boolean} true if the user has the right permissions, else false
     */
    messageSenderHasRightPermissions(message: Message): boolean {
        if (
            message.member &&
            message.member.voice &&
            message.member.voice.channel &&
            message.client.user
        ) {
            const permissions = message.member.voice.channel.permissionsFor(
                message.client.user
            );
            if (
                permissions &&
                (!permissions.has("CONNECT") || !permissions.has("SPEAK"))
            ) {
                this.messageComponent.reply(
                    message,
                    "You don't have the correct permissions"
                );
                return false;
            } else return true;
        } else return false;
    }

    /**
     * Check's if the sender of the message is in a voice channel.
     *
     * @param {Message} message the message which the user sent with valid music command
     * @returns {boolean} true if the user is a voice channel
     */
    messageSenderInVoiceChannel(message: Message): boolean {
        if (
            message.member &&
            message.member.voice &&
            message.member.voice.channel
        ) {
            return true;
        } else {
            if (this.messageComponent) {
                this.messageComponent.reply(
                    message,
                    "You need to be in a channel to execute this command!"
                );
            }
            return false;
        }
    }

    /**
     * Get's the current song, and sends it to the user
     *
     * @param {Message} message the Discord message which requested to get the current song
     */
    getCurrentSong(message: Message): void {
        const current = this.musicQueue.getCurrentSong();
        if (current) {
            this.messageComponent.reply(
                message,
                "Current song: ***" +
                    current.title +
                    "*** at ***" +
                    current.url +
                    "***"
            );
        }
    }

    /**
     * Get's the current music queue, and sends it to the user
     *
     * @param {Message} message the Discord message which requested to get the queue
     */
    getQueuedMusic(message: Message): void {
        // TODO current queue in nice format
        const current = this.musicQueue.getCurrentSong();
        const queue = this.musicQueue.getQueuedMusic();
        let reply = "";
        if (current) {
            reply += "***Current song: *** " + current?.title + "\n";
        }
        if (queue.length > 0) {
            reply += "***The queue has " + queue.length + " songs:***\n";
            for (const song of queue) {
                reply += song.title + " at " + song.url + "\n";
            }
        }
        message
            .reply(reply)
            .then((msg) => this.messageComponent.deleteMsgTimeout(msg));
        this.messageComponent.deleteMsgNow(message);
    }

    /**
     * Stop's playing music
     *
     * @param {?Message} message the message that requested to stop the music
     */
    stopMusic(message: Message | undefined = undefined): void {
        if (this.musicPlayer.stop()) {
            this.musicQueue.stop();
            this.activityDisplayComponent.setDefault();
            if (message) {
                this.messageComponent.reply(
                    message,
                    "Bye Bye :smiling_face_with_tear:"
                );
            }
        }
    }

    /**
     * Start's or stop's looping the current queue in the queue
     *
     * @param {Message} message the Discord message which requested to loop the queue
     */
    loopMusicQueue(message: Message): void {
        const isQueueLooping = this.musicQueue.toogleQueueLooping();
        if (isQueueLooping) {
            this.messageComponent.reply(
                message,
                "You started looping the queue!"
            );
            this.loggingComponent.log(
                message.author.username + " started looping the queue"
            );
        } else {
            this.messageComponent.reply(
                message,
                "You stopped looping the queue!"
            );
            this.loggingComponent.log(
                message.author.username + " stopped looping the queue"
            );
        }
    }

    /**
     * Start's or stop's looping the current song in the queue
     *
     * @param {Message} message the Discord message which requested to loop the current song
     */
    loopCurrentSong(message: Message): void {
        const isSongLooping = this.musicQueue.toogleSongLooping();
        if (isSongLooping) {
            this.messageComponent.reply(
                message,
                "You started looping the current song!"
            );
            this.loggingComponent.log(
                message.author.username + " started looping the current song"
            );
        } else {
            this.messageComponent.reply(
                message,
                "You stopped looping the current song!"
            );
            this.loggingComponent.log(
                message.author.username + " stopped looping the current song"
            );
        }
    }

    /**
     * Get the voice channel from message, if config not available, falls back to function parameter
     *
     * @param {VoiceChannel} voiceChannel the voice channel the user is in
     * @param {Message} message the message that has the music command
     * @returns {?VoiceChannel} the new music voice channel
     */
    async getVoiceChannel(
        voiceChannel: VoiceChannel,
        message: Message
    ): Promise<VoiceChannel> {
        return this.musicPlayer.getVoiceChannel(voiceChannel, message);
    }

    /**
     * Queues a music from YouTube
     *
     * @param {Message} message the Discord message containing the URL
     * @param {VoiceChannel} voiceChannel the message sender's voice channel
     * @param {MusicData} music the music to be played
     */
    queueMusic(
        message: Message,
        voiceChannel: VoiceChannel,
        music: MusicData
    ): void {
        if (music.title) {
            this.messageComponent.reply(
                message,
                ":musical_note: Queued: ***" +
                    music.title +
                    "*** at ***" +
                    music.url +
                    "***",
                false
            );
        } else {
            this.messageComponent.reply(
                message,
                ":musical_note: Queued: ***" + music.url + "***",
                false
            );
        }
        if (!this.musicQueue.isPlayingMusic) {
            this.startPlayingMusic(message, voiceChannel, music);
        } else {
            this.musicQueue.add([music]);
            this.messageComponent.deleteMsgNow(message);
        }
    }

    /**
     * Removes music from the queue
     *
     * @param {string} number the index or range in the queue
     * @param {Message} message the Discord message which requested to remove the music from the queue
     */
    removeFromQueue(number: string, message: Message): void {
        let removedSongs: MusicData[] = [];
        if (number.indexOf("-") === -1) {
            const removed = this.musicQueue.remove(parseInt(number) - 1);
            if (removed) {
                removedSongs.push(removed);
            }
        } else {
            const indexes = number.split("-");
            if (indexes.length <= 1) return;
            if (indexes[0] && indexes[1]) {
                const indexFrom = parseInt(indexes[0]) - 1;
                const indexTo = parseInt(indexes[1]) - 1;
                if (indexFrom == indexTo) this.musicQueue.remove(indexFrom);
                else if (indexFrom < indexTo) {
                    removedSongs = this.musicQueue.removeRange(
                        indexFrom,
                        indexTo
                    );
                } else {
                    removedSongs = this.musicQueue.removeRange(
                        indexTo,
                        indexFrom
                    );
                }
            }
        }
        // TODO better removed songs message formatting
        let reply = "***Removed " + removedSongs.length + " songs:***\n";
        for (const song of removedSongs) {
            reply += song.title + " at " + song.url + "\n";
        }
        this.loggingComponent.log(
            message.author.username +
                " removed " +
                removedSongs.length +
                " songs"
        );
        message
            .reply(reply)
            .then((msg) => this.messageComponent.deleteMsgTimeout(msg));
        this.messageComponent.deleteMsgNow(message);
    }

    /**
     * Replays the current song
     *
     * @param {Message} message the Discord message which requested the replay
     */
    replayMusic(message: Message): void {
        const lastSong = this.musicQueue.replay();
        if (lastSong) {
            this.messageComponent.reply(message, "You replayed a song!");
            this.loggingComponent.log(
                message.author.username + " replayed a song"
            );
            this.musicPlayer.playNext(this, lastSong);
        } else {
            this.messageComponent.reply(
                message,
                "It seems there are no song to replay."
            );
        }
    }

    /**
     * Resumes playing music
     *
     * @param {Message} message the Discord message which requested the resume
     */
    resumeMusic(message: Message): void {
        if (this.musicQueue.isPlayingMusic) {
            this.musicPlayer.resumeMusic(message);
        } else {
            this.messageComponent.reply(
                message,
                "Not playing a song currently!"
            );
        }
    }

    /**
     * Pauses the music
     *
     * @param {Message} message the Discord message which requested the pause
     */
    pauseMusic(message: Message): void {
        if (this.musicQueue.isPlayingMusic) {
            this.musicPlayer.pauseMusic(message);
        } else {
            this.messageComponent.reply(
                message,
                "Not playing a song currently!"
            );
        }
    }

    /**
     * Shuffle's the queue
     *
     * @param {Message} message the Discord message which requested to shuffle the queue
     */
    shuffleMusic(message: Message): void {
        if (this.musicQueue.isPlayingMusic) {
            if (this.musicQueue.shuffle()) {
                this.messageComponent.reply(message, "You shuffled the music.");
                this.loggingComponent.log(
                    message.author.username + " shuffled the music"
                );
            }
        } else {
            this.messageComponent.reply(
                message,
                "Not playing a song currently!"
            );
        }
    }

    /**
     * Skip's a song
     *
     * @param {Message} message the Discord message which requested to skip a song
     */
    skipSong(message: Message): void {
        if (this.musicQueue.isPlayingMusic) {
            this.messageComponent.reply(message, "You skipped a song!");
            this.loggingComponent.log(
                message.author.username + " skipped a song"
            );
            this.continuePlayingMusic();
        } else {
            this.messageComponent.reply(
                message,
                "Not playing a song currently!"
            );
        }
    }

    /**
     * Imports and plays a YouTube playlist
     *
     * @param {Message} message the Discord message which requested to play a playlist
     * @param {VoiceChannel} voiceChannel the Discord channel where to play the music
     * @param {string} id the YouTube id of the playlist
     */
    async playYouTubePlaylist(
        message: Message,
        voiceChannel: VoiceChannel,
        id: string
    ): Promise<void> {
        const songs = await this.youtubeService.getPlaylistFromId(id);
        this.musicQueue.add(songs);
        const current = this.musicQueue.getNext();
        if (current) {
            this.messageComponent.reply(
                message,
                "You started playing a YouTube Playlist!",
                false
            );

            this.loggingComponent.log(
                message.author.username + " imported a YouTube playlist"
            );
            this.startPlayingMusic(message, voiceChannel, current);
        }
    }

    /**
     * Play's music. If currently playing music, overrides it, if not, starts playing music.
     *
     * @param {Message} message the Discord message containing the URL
     * @param {VoiceChannel} voiceChannel the message sender's voice channel
     * @param {MusicData} music the music to be played
     */
    startPlayingMusic(
        message: Message,
        voiceChannel: VoiceChannel,
        music: MusicData
    ): void {
        this.musicQueue.play(music);
        this.musicPlayer.play(this, message, voiceChannel, music);
        this.activityDisplayComponent.setMusicPlaying();
    }

    /**
     * Continues playing music if the queue is not empty
     */
    continuePlayingMusic(): void {
        if (this.musicPlayer.hasMembersInVoice()) {
            const currentSong = this.musicQueue.getNext();
            if (currentSong) {
                this.musicPlayer.playNext(this, currentSong);
            } else {
                this.stopMusic();
            }
        } else {
            this.stopMusic();
        }
    }
}
