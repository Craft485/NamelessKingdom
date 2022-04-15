import * as Discord from 'discord.js'
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

interface itemProps {
    name: string,
    description: string,
    attack?: number,
    value?: number
}

class Item {
    name: string
    description: string
    attack?: number
    value?: number
    constructor (props: itemProps) {
        this.name = props.name
        this.description = props.description
        this.attack = props.attack || 0
        this.value = props.value
    }

    info (msg: Discord.Message) {
        msg.channel.send(`> ${this.name}\n> ${this.description}`)
    }

    equip (msg: Discord.Message) {
        const id = parseInt(msg.author.id)

        con.query('UPDATE users SET equippedItem = ? WHERE id = ?;', [this.name, id], (err: Error) => {
            if (err) {
                fs.writeFileSync('../../logs/ERR.log', `\n\n${err}`, { flags: "a" })
                console.error('Error updating users\n', err)
                return msg.reply('an error occured')
            }
            return msg.channel.send(`${msg.author.username} equipped ${this.name}`)
        })
    }
}

const stick = new Item({ name: 'stick', description: 'A pointy stick, perhaps not a great weapon but its a start.', attack: 2 })
const basic_sword = new Item({ name: 'Basic Sword', description: 'A little flimsy, but sharp enough to get the job done.', attack: 3 })

module.exports.itemList = {
    stick: stick, basic_sword: basic_sword
}