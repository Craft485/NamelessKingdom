import * as Discord from 'discord.js'
const { enemyList } = require('./Enemy')
const fs = require('fs')
const config = require('../../config.json')
const mysql = require('mysql')
const con = mysql.createConnection({
    host: config.sql.host,
    port: config.sql.port,
    user: config.sql.user,
    password: config.sql.password,
    database: config.sql.database
})

interface localeProps {
    name: string,
    enemyList: Array<any>,
    description: string,
    neighbors: Array<string>
    isCity?: boolean
}

class Location {
    name: string
    enemyList: Array<any>
    isCity: boolean
    neighbors: Object
    description: string
    constructor(props: localeProps) {
        this.name = props.name
        this.enemyList = props.enemyList
        this.isCity = props.isCity || null
        this.neighbors = {
            North: props.neighbors[0] || null,
            East: props.neighbors[1] || null,
            South: props.neighbors[2] || null,
            West: props.neighbors[3] || null
        }
        this.description = props.description
    }
    
    /**
     * List info on current location
     */
    info (msg: Discord.Message) {
        let data: string = ''
        for (const [direction, location] of Object.entries(this.neighbors)) if (location) data += `\t#Travel [${direction}] to arrive at [${location}].\n`

        const response = new Discord.MessageEmbed()
            .setColor(config.colors.green)
            .addField(this.name, 
                '```css\n' +
                '{}@Neighboring-Locations{}\n' +
                data +
                '```')
            .setFooter(this.description)

        return msg.channel.send(response)
    }

    /**
     * Travel to a neighboring location
     */
    travel (msg: Discord.Message, args: string[]) {
        const id = msg.author.id

        // Check for user existing
        con.query('SELECT * FROM users WHERE id = ?;', [id], (err: Error, userData: any[]) => {
            if (err) {
                // fs.writeFileSync('../../logs/ERR.log', `\n\n${err}`, { flags: "a" })
                console.error('Error selecting from users\n', err)
                return msg.reply('an error occured')
            }

            if (userData?.length > 0) {
                const destination = args[1] || args[0]
                // Is the destination valid?
                const a = Object.values(this.neighbors).find(d => d?.toLowerCase() === destination?.toLowerCase())
                const b = Object.keys(this.neighbors).find(d => d?.toLowerCase() === destination?.toLowerCase())
                // Tile casing, ensure that the first letter is capital and the rest are lower case
                const tileCased = destination?.charAt(0)?.toUpperCase() + destination?.substr(1)?.toLowerCase()
                const finalDestination = a ? tileCased : b ? this.neighbors[tileCased] : null
                
                if (finalDestination) {
                    con.query('UPDATE users SET location = ? WHERE id = ?;', [finalDestination, id], (err: Error) => {
                        if (err) {
                            fs.writeFileSync('../logs/ERR.log', `\n\n${err}`, { flags: "a" })
                            console.error('Error updating users\n', err)
                            return msg.reply('an error occured')
                        }
                        return msg.reply(`you make your way to ${finalDestination} and arrive safely, but dangers still lurk all around you.`)
                    })
                } else {
                    return msg.reply('an error occured')
                }
            } else {
                return msg.reply(`we couldn't find you in the database. Have you used ${config.prefix}start yet?`)
            }
        })
    }
}

const knossos = new Location({ name: 'Knossos', description: 'placeholder', neighbors: ['Mycenae'], enemyList: [enemyList.goblin] })
const Mycenae = new Location({ name: 'Mycenae', description: 'placeholder', neighbors: [null, null, 'Knossos'], enemyList: [enemyList.goblin] })

module.exports.locationList = {
    Knossos: knossos, Mycenae: Mycenae
}