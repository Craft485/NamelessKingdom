const { Client, Message, Collection, Intents } = require('discord.js')
const { prefix } = require('./config.json')
const { token } = require('./t.json')
const { interval } = require('./utils/interval')
const fs = require('fs')
require('colors')

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] })
client.commands = new Collection()

// Load commands
const commandFiles = fs.readdirSync('./commands').filter(f => f.endsWith('.js'))
const loadedCommands = []

for (const commandFile of commandFiles) {
    const command = require(`./commands/${commandFile}`)
    client.commands.set(command.name, command)
    loadedCommands.push(command.name)
}

client.once("ready", () => {
    console.log(`Logged in as ${client.user.username} | User ID: ${client.user.id}`.cyan)
    console.log(`Guild count: ${client.guilds.cache.size}`.magenta)
    setTimeout(() => { console.log(`Loaded ${loadedCommands.length} commands`.cyan) }, 500)
    console.log(`Ready!`.green)
    // Update user values every 5 minutes
    setInterval(interval, 300000)
})

/**
 * @param {Message} msg
 */
client.on("message", (msg) => {
    // Don't reply to self or other bots, or if the message isn't a command
    if (msg.author.bot || !msg.content.startsWith(prefix)) return
    const args = msg.content.slice(prefix.length).trim().split(' ')
    const commandName = args.shift().toLowerCase()

    const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName))

    if (!command) return
    if (command.args && !args.length) return msg.reply(`Incorrect arguments provided.\n\n\`${prefix}${command.name} ${command.usage ? command.usage : ''}\``)

    try {
        command.execute(msg, args)
    } catch (err) {
        console.error(`ERR: ${err}`.red)
        msg.channel.send('An error occured while trying to execute that command, this event has been logged')
        fs.writeFileSync('../logs/ERR.log', `\n\n${err}`, { flag: 'a' })
    }
})

client.login(token)