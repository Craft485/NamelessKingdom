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
    attack?: Array<number>,
    value?: number
}

class Item {
    name: string
    description: string
    attack?: Array<number>
    value?: number
    constructor (props: itemProps) {
        this.name = props.name
        this.description = props.description
        this.attack = props.attack || null
        this.value = props.value
    }

    info (msg: Discord.Message) {
        msg.channel.send(`> ${this.name}\n> ${this.description}`)
    }

    equip (msg: Discord.Message) {
        const id = msg.author.id

        con.query('UPDATE users SET equippedItem = ?, attack = ? WHERE id = ?;', [this.name, JSON.stringify(this.attack), id], (err: Error, res) => {
            if (err) {
                fs.writeFileSync('./logs/ERR.log', `\n\n${err}`, { flags: "a" })
                console.error('Error updating users\n', err)
                return msg.reply('An error occured')
            }
            return msg.reply(`You equipped \`${this.name}\`, careful with that thing!`)
        })
    }
}

/** @deprecated Keeping this for future reference, however it should not be used anywhere */
const stick = new Item({ name: 'stick', description: 'A pointy stick, perhaps not a great weapon but its a start.', attack: [2, 3] })
/** @deprecated Keeping this for future reference, however it should not be used anywhere */
const basic_sword = new Item({ name: 'Basic Sword', description: 'A little flimsy, but sharp enough to get the job done.', attack: [3, 4] })

// Load items from JSON file
const itemList = {}
const itemJSONList = require('../../items.json')
Object.keys(itemJSONList).forEach((key: string) => {
    const itemTemplate = itemJSONList[key]
    itemList[key] = new Item({ name: key, description: itemTemplate.description, attack: itemTemplate.attack })
})

module.exports.itemList = itemList