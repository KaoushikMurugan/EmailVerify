const {SlashCommandBuilder} = require("@discordjs/builders");
const database = require("../database/Database.js");
const {serverSettingsMap} = require("../EmailBot");
module.exports = {
    data: new SlashCommandBuilder().setName('verifiedrole').setDescription('returns the name of the verified role').addRoleOption(option => option.setName('verifiedrole').setDescription('set the role name for the verified role')),
    async execute(interaction) {
        const verifiedRole = interaction.options.getRole('verifiedrole');
        if (verifiedRole == null) {
            await interaction.reply("Verified role: " + serverSettingsMap.get(interaction.guild.id).verifiedRoleName)
        } else {
            const serverSettings = serverSettingsMap.get(interaction.guild.id);
            serverSettings.verifiedRoleName = verifiedRole.name
            serverSettingsMap.set(interaction.guild.id, serverSettings)
            await interaction.reply("Verified role changed to " + verifiedRole.name)
            database.updateServerSettings(interaction.guildId, serverSettings)
        }
    }
}