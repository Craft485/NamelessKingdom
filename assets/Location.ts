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
    usage: '[-m or -c or -i or -f]',
    execute: (msg: Message, args: Array<string>) => {
        const id = msg.author.id

        con.query('SELECT * FROM users WHERE id = ?;', [id], (err: Error, userData: any[]) => {
            if (err) {
                fs.writeFileSync('./logs/ERR.log', `\n\n${err}`, { flags: "a" })
                console.error('Error selecting from users\n', err)
                return msg.reply('An error occured')
            }
            // console.log(userData)
            if (!userData || userData.length <= 0) {
                return msg.reply(`We couldn\'t find you in the database, have you used ${config.prefix}start yet?`)
            } else {
                // User exists, parse arguments to see what exactly to do next
                const arg = args[0]

                if (['-m', '-c', '-move', '-change', '-t', '-travel'].includes(arg?.toLowerCase())) {
                    // Move/change to a new location(next arg is location name)
                    locationList[userData[0].location].travel(msg, args)
                } else if (['-i', '-info'].includes(arg?.toLowerCase()) || !arg) {
                    // Show info on location
                    locationList[userData[0].location].info(msg)
                } else if (['-f', '-fight'].includes(arg?.toLowerCase())) {
                    // Fight at the current location
                    const location = locationList[userData[0].location]

                    if (location.enemyList?.length > 0) {
                        return location.enemyList[Math.floor(location.enemyList.length * Math.random())].beginBattle(msg)
                    } else {
                        return msg.reply('There is nothing to fight here.')
                    }
                }
            }
        })
    }
}