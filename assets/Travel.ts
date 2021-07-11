import { Message } from 'discord.js'
const fs = require('fs')
const config = require('../config.json')
const mysql = require('mysql')
const con = mysql.createConnection({
    host: config.sql.host,
    port: config.sql.port,
    user: config.sql.user,
    password: config.sql.password,
    database: config.sql.database
})
const { locationList } = require('./utils/Location')

module.exports = {
    name: 'travel',
    description: 'Travel to a neighboring location',
    aliases: ['t'],
    usage: '{direction | location name}',
    execute: (msg: Message, args: Array<string>) => {
        const id = msg.author.id

        con.query('SELECT * FROM users WHERE id = ?;', [id], (err: Error, userData: any[]) => {
            if (err) {
                fs.writeFileSync('../logs/ERR.log', `\n\n${err}`, { flags: "a" })
                console.error('Error selecting from users\n', err)
                return msg.reply('an error occured')
            }

            userData?.length > 0 ? locationList[userData[0].location].travel(msg, args) : msg.reply(`you don't appear in the database. Have you used ${config.prefix}start yet?`)

            // if (userData?.length > 0) {
            //     locationList[userData[0].location].travel(msg, args)
            // } else {
            //     msg.reply(`you don't appear in the database. Have you used ${config.prefix}start yet?`)
            // }
        })
    }
}