const {SlashCommandBuilder} = require("@discordjs/builders");
const database = require("../database/Database.js");
const md5hash = require("../crypto/Crypto")

module.exports = {
    data: new SlashCommandBuilder().setDefaultPermission(true).setName('get_user_data').setDescription('get user data')
        .addStringOption(option => option.setName('email').setDescription('email').setRequired(true)),
    async execute(interaction) {
        const email = interaction.options.getString('email', true);
        const hashedEmail = md5hash(email);
        await interaction.reply({ embeds: [{
            title: `Getting user data for ${email} ...`, 
        }], ephemeral: true});
        // get user data from the database
        const found = database.getEmailUser(hashedEmail, interaction.guild.id, async (emailUser) => {
            if(emailUser) {
                found = true;
                await interaction.editReply({ embeds: [{
                    title: "User Data",
                    description: `**Email:** ${email}\n**UserId:** ${emailUser.userID}\n**User**: <@${emailUser.userID}>`,
                }]});
            }
        })
        if(found !== false) {
            await interaction.editReply({ embeds: [{
                title: `Error: The email ${email} not found in database for this server`
            }]});
        }
            
        // send user data to the user
    }
}