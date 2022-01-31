const ServerSettings = require("../database/ServerSettings");
const UserTimeout = require("../UserTimeout");
const database = require("../database/Database");
const EmailUser = require("../database/EmailUser");
const {getLocale} = require("../Language");
const md5hash = require("../crypto/Crypto");

module.exports = async function (message, bot, serverSettingsMap, userGuilds, userCodes, userTimeouts, mailSender, emailNotify) {

    if (message.channel.type !== 'DM' || message.author.id === bot.user.id) {
        return
    }
    const userGuild = userGuilds.get(message.author.id)
    if (!userGuild) {
        return
    }
    const serverSettings = serverSettingsMap.get(userGuild.id)
    if (!serverSettings) {
        serverSettingsMap.set(userGuild.id, new ServerSettings())
        return
    }
    if (!serverSettings.status) {
        return
    }
    let text = message.content
    let userTimeout = userTimeouts.get(message.author.id)
    if (!userTimeout) {
        userTimeout = new UserTimeout()
        userTimeouts.set(message.author.id, userTimeout)
    }
    let userCode = userCodes.get(message.author.id + userGuilds.get(message.author.id).id)
    if (userCode && userCode.code === text) {
        userTimeout.resetWaitTime()
        const roleVerified = userGuilds.get(message.author.id).roles.cache.find(role => role.id === serverSettings.verifiedRoleName);
        const roleUnverified = userGuilds.get(message.author.id).roles.cache.find(role => role.id === serverSettings.unverifiedRoleName);

        database.getEmailUser(userCode.email, userGuilds.get(message.author.id).id, async (currentUserEmail) => {
            let member = await bot.guilds.cache.get(currentUserEmail.guildID).members.fetch(currentUserEmail.userID)
            if (message.author.id === currentUserEmail.userID) {
                return
            }
            try {
                await member.roles.remove(roleVerified)
                if (roleUnverified) {
                    await member.roles.add(roleUnverified)
                }
            } catch (e) {
                console.log(e)
            }
            try {
                await member.send("You got unverified on " + userGuilds.get(message.author.id).name + " because somebody else used that email!")
            } catch {
            }

        })
        database.updateEmailUser(new EmailUser(userCode.email, message.author.id, userGuilds.get(message.author.id).id, serverSettings.verifiedRoleName, 0))
        let verify_client
        try {
            verify_client = userGuilds.get(message.author.id).members.cache.get(message.author.id)
            await verify_client.roles.add(roleVerified);

        } catch (e) {
            await message.author.send(getLocale(serverSettings.language, "userCantFindRole"))
            return
        }
        try {
            if (serverSettings.unverifiedRoleName !== "") {
                await verify_client.roles.remove(roleUnverified);
            }
        } catch {
        }
        await message.reply(getLocale(serverSettings.language, "roleAdded", roleVerified.name))
        userCodes.delete(message.author.id + userGuilds.get(message.author.id).id)
    } else {
        let validEmail = false
        for (const domain of serverSettings.domains) {
            if (text.endsWith(domain)) {
                validEmail = true
            }
        }
        if (text.split("@").length - 1 !== 1) {
            validEmail = false
        }
        if (text.includes(' ') || !validEmail) {
            await message.reply(getLocale(serverSettings.language, "mailInvalid"))
        } else {
            let timeoutSeconds = userTimeout.timestamp + userTimeout.waitseconds * 1000 - Date.now()
            if (timeoutSeconds > 0) {
                await message.author.send(getLocale(serverSettings.language, "mailTimeout", (timeoutSeconds / 1000).toFixed(2)))
                return
            }
            userTimeout.timestamp = Date.now()
            userTimeout.increaseWaitTime()
            let code = Math.floor((Math.random() + 1) * 100000).toString()

            mailSender.sendEmail(text, code, userGuilds.get(message.author.id).name, message, emailNotify, (email) => userCodes.set(message.author.id + userGuilds.get(message.author.id).id, {
                code: code,
                email: md5hash(email.toLowerCase())
            }))
        }
    }
}