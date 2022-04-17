import { Message } from 'discord.js'
const fs = require('fs')
const { itemList } = require('./utils/Item')
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
    name: 'start',
    description: 'Begin your adventure',
    aliases: ['s'],
    usage: '',
    execute: (msg: Message, args: Array<string>) => {
        // Check DB for user preexisting, return if they're already in there
        const id = msg.author.id
        con.query('SELECT * FROM users WHERE id = ?;', [id], (err: Error, data: Array<Array<any>>) => {
            if (err) {
                fs.writeFileSync('./logs/ERR.log', `\n\n${err}`, { flags: "a" })
                console.error('Error selecting from users\n', err)
                return msg.reply('An error occured')
            }

            // User is new, add to db
            if (!data || !data.length) {
                con.query('INSERT INTO users (id, name, attack, equippedItem) VALUES(?, ?, ?, \'stick\'); INSERT INTO inventory (id, name) VALUES (?, "stick")', [id, msg.author.username, itemList.stick.attack, id], (err: Error) => {
                    if (err) {
                        fs.writeFileSync('./logs/ERR.log', `\n\n${err}`, { flags: "a" })
                        console.error('Error adding new user\n', err)
                        return msg.reply('An error occured')
                    }
                    return msg.reply(`Welcome to Nameless Kingdom, a text based rpg. You can use ${config.prefix}help to view a list of available commands, good luck!`)
                })
            } else {
                return msg.reply('You\'ve already begun your adventure')
            }
        })
    }
}