import { Message } from "discord.js";
import Elia from "../../../Elia";
import Command from "../../Command";
import { CommandTypeEnum } from "../../CommandTypeEnum";

export default class ReplaySongCommand extends Command {
    name = "replay";
    description = "Replays the last played song";
    usage = "";
    type = CommandTypeEnum.MUSIC;
    execute(message: Message, _args: string[], elia: Elia): void {
        if (
            elia.dataComponent.getRadioMode() ||
            (elia.musicComponent?.messageSenderInVoiceChannel(message) &&
                elia.musicComponent.messageSenderHasRightPermissions(message))
        )
            elia.musicComponent?.musicQueue?.replayMusic(message);
    }
}
