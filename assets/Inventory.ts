import { Message, MessageEmbed } from 'discord.js'
const fs = require('fs')
const config = require('../config.json')
const mysql = require('mysql')
const con = mysql.createConnection({
    host: config.sql.host,
    port: config.sql.port,
    user: config.sql.user,
    password: config.sql.password,
    database: config.sql.database,
    multipleStatements: true
})

module.exports = {
    name: 'inventory',
    description: 'Show what items you have stowed away, how are you carrying so much stuff? I don\'t know, don\'t ask questions just hit the troll with the axe and move on.',
    aliases: ['inv'],
    usage: '',
    execute: (msg: Message, args: Array<string>) => {
        const id = msg.author.id
        // Getting fancy with multiple statements
        con.query(`SELECT * FROM users WHERE id = ${id}; SELECT * FROM inventory WHERE id = ${id};`, (err: Error, results: Array<any>) => {
            if (err) {
                fs.writeFileSync('./logs/ERR.log', `\n\n${err}`, { flags: "a" })
                console.error('Error selecting from users(Inventory)\n', err)
                return msg.reply('An error occured')
            }

            const userData = results[0]
            const inventoryData = results[1]

            if (userData?.length === 0) return msg.reply(`Unknown user, have you used ${config.prefix}start yet?`)

            if (inventoryData?.length === 0) return msg.reply('You feel light as you realize you aren\'t carrying anything')

            const items = []

            inventoryData.forEach(item => {
                items.push(`${item.name} x${item.quantity}`)
            })

            const res = new MessageEmbed({
                color: config.colors.green,
                fields: [{
                    name: `${msg.author.username}\'s Inventory`,
                    value: '```asciidoc\n' + items.join('\n') + '\n```'
                }]
            })

            return msg.channel.send({ embeds: [res] })
        })
    }
}