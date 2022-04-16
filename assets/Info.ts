import { Message, MessageEmbed } from 'discord.js'
const fs = require('fs')
const { itemList } = require('./utils/Item')
const { enemyList } = require('./utils/Enemy')
const config = require('../config.json')
const mysql = require('mysql')
const con = mysql.createConnection({
    host: config.sql.host,
    port: config.sql.port,
    user: config.sql.user,
    password: config.sql.password,
    database: config.sql.database
})

module.exports = {
    name: 'info',
    description: 'Get information about a player, item, or enemy',
    aliases: ['i'],
    usage: '[item name or enemy name]',
    execute: (msg: Message, args: Array<string>) => {
        const id = msg.author.id

        // Check for user in database
        con.query('SELECT * FROM users WHERE id = ?;', [id], (err: Error, userData: any[]) => {
            if (err) {
                fs.writeFileSync('./logs/ERR.log', `\n\n${err}`, { flags: "a" })
                console.error('Error selecting from users\n', err)
                return msg.reply('An error occured')
            }

            if (userData?.length > 0) {
                const response = new MessageEmbed({ color: "#808080" })
                const infoItem = args?.join(' ')

                if (!args || !args.length) {
                    // Show info on user
                    response.setTitle(msg.author.username)
                    response.addField('Info', 
                        `Max Health: ${userData[0].maxHealth}\n`+
                        `Current Health: ${userData[0].currentHealth}\n`+
                        `Current Item: ${userData[0].equippedItem}\n`+
                        `Current Location: ${userData[0].location}\n`+
                        `Gold: ${userData[0].gold}`)
                } else if (infoItem) {
                    // Show info on an item/enemy
                    const isItem = Object.keys(itemList).find(itemName => itemName.toLowerCase() === infoItem.toLowerCase())
                    const isEnemy = Object.keys(enemyList).find(enemyName => enemyName.toLowerCase() === infoItem.toLowerCase())
                    // Yes there is a better way to achieve this
                    if (isItem) {
                        const item = itemList[infoItem.toLowerCase()]
                        response.addField(item.name, 
                            `${item.description}\n\n` +
                            `Attack: ${item.attack || 'N/A'}`)
                    } else if (isEnemy) {
                        const enemy = enemyList[infoItem.toLowerCase()]
                        response.addField(enemy.name,
                            `${enemy.description}\n\n` +
                            `placeholder`)
                    } else {
                        return msg.reply('Unknown argument given')
                    }
                }

                return msg.channel.send({ embeds: [response] })
            } else {
                return msg.reply(`We couldn't find you in the databse, have you used ${config.prefix}start yet?`)
            }
        })
    }
}