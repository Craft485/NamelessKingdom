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
    name: 'location',
    description: 'View info on current location, or change location',
    aliases: ['l'],
    usage: '[-m -c -i -f]',
    execute: (msg: Message, args: Array<string>) => {
        const id = msg.author.id

        con.query('SELECT * FROM users WHERE id = ?;', [id], (err: Error, userData: any[]) => {
            if (err) {
                fs.writeFileSync('../logs/ERR.log', `\n\n${err}`, { flags: "a" })
                console.error('Error selecting from users\n', err)
                return msg.reply('an error occured')
            }
            // console.log(userData)
            if (!userData || userData.length <= 0) {
                return msg.reply(`we couldn\'t find you in the database, have you used ${config.prefix}start yet?`)
            } else {
                // User exists, parse arguments to see what exactly to do next
                const arg = args[0]

                if (arg?.toLowerCase() === '-m' || arg?.toLowerCase() === '-c') {
                    // Move/change to a new location(next arg is location name)
                } else if (arg?.toLowerCase() === '-i' || !arg) {
                    // Show info on location
                } else if (arg?.toLowerCase() === '-f') {
                    // Fight at the current location
                    const location = locationList[userData[0].location]

                    if (location.enemyList?.length > 0) {
                        return location.enemyList[Math.floor(location.enemyList.length * Math.random())].beginBattle(msg)
                    } else {
                        return msg.reply('there is nothing to fight here.')
                    }
                }
            }
        })
    }
}