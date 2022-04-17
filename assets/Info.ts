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
                const infoItem: string = args?.join(' ').toLowerCase().split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ')

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
                    const validItem: any = Object.values(itemList).find((item: any) => item.name.toLowerCase() === infoItem.toLowerCase())
                    const validEnemy: any = Object.values(enemyList).find((enemy: any) => enemy.name.toLowerCase() === infoItem.toLowerCase())
                    
                    if (validItem) {
                        response.addField(validItem.name, 
                            `${validItem.description}\n\n` +
                            `Attack: ${validItem.attack || 'N/A'}`)
                    } else if (validEnemy) {
                        response.addField(validEnemy.name,
                            `${validEnemy.description}\n\n` +
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