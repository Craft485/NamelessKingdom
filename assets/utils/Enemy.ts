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

interface enemyProps {
    name?: string,
    health?: number,
    attack?: number,
    description?: string,
    drops?: Map<any, number>,
    specialAttack?: Function
}

// Key is user id
let currentBattles: Map<number, Array<enemyProps>> = new Map()

class Enemy {
    props: enemyProps
    name: string
    health: number
    attack: number
    description: string
    drops?: Map<any, number>
    constructor(props: enemyProps) {
        this.props = props
        this.name = props.name
        this.health = props.health
        this.attack = props.attack
        this.description = props.description
        this.drops = props.drops
        this.beginRound = this.beginRound
    }

    /**
     * Start a battle(-fight command)
     */
    beginBattle (msg: Discord.Message) {
        const id = msg.author.id
        // If we are already in a battle then continue it
        if (currentBattles.has(parseInt(id))) return this.beginRound(msg)
        // Get user info if they aren't currently in a battle
        con.query('SELECT * FROM users WHERE id = ?;', [id], (err: Error, data: Array<any>) => {
            if (err) {
                fs.writeFileSync('../../logs/ERR.log', `\n\n${err}`, { flags: "a" })
                console.error('Error selecting from users\n', err)
                return msg.reply('an error occured')
            }
            // Set battle data to be used in beginRound
            if (data?.length > 0) {
                currentBattles.set(parseInt(id), [{ health: data[0].currentHealth, attack: data[0].attack }, this])
                // Take the first turn of the battle
                this.beginRound(msg)
            } else {
                return msg.reply(`could not locate ${msg.author.username} in database, have you used ${config.prefix}start yet?`)
            }
        })
    }

    /**
     * Take a full turn during a fight
     */
    beginRound (msg: Discord.Message): Promise<Discord.Message> {
        const id = msg.author.id

        if (currentBattles.has(parseInt(id))) {
            const battle = currentBattles.get(parseInt(id))

            const player = battle[0]
            const enemy = battle[1]

            player.health -= enemy.attack
            enemy.health -= player.attack

            const response = new Discord.MessageEmbed()
                .setColor(config.colors.red)
                .addField('Battle Info', "```diff\n" + 
                `- ${msg.author.username} took ${enemy.attack} damage\n` +
                `- ${enemy.name} took ${player.attack} damage\n\n` +
                `+ ${msg.author.username} has ${player.health} health left\n` +
                `+ ${enemy.name} has ${enemy.health} health left\n` + 
                "```")
            
            if (player.health <= 0 || enemy.health <= 0) {
                // End battle
                
                response.addField("Battle End", 
                `${player.health <= 0 
                    ? `The ${enemy.name} has won, you crawl away, defeated, but will live to fight another day.` 
                    : `The ${enemy.name} lays dead at your feet.\n${(function (): string {
                        let data: string = ''
                        let entries = currentBattles.get(parseInt(id))[1].drops?.entries()
                        if (entries) {
                            for (let i = 0; i < currentBattles.get(parseInt(id))[1].drops.size; i++) {
                                const entry: Array<any | number> = entries.next().value
                                data += `${entry[1]} **${entry[0]}**\n`
                            }
                            return data
                        }
                        return ' '
                    }())}`
                }`)
                
                /** @todo: Add new items to inventory */
                
                con.query('UPDATE users SET currentHealth = ? WHERE id = ?;', [player.health <= 0 ? 1 : player.health, id], (err: Error) => {
                    if (err) {
                        fs.writeFileSync('../../logs/ERR.log', `\n\n${err}`, { flags: "a" })
                        console.error('Error updating users\n', err)
                        return msg.reply('an error occured')
                    }        
                })

                currentBattles.delete(parseInt(id))

                return msg.channel.send(response)
            } else {
                // Make sure the battle info updates
                currentBattles.set(parseInt(id), [{ health: player.health, attack: player.attack }, enemy])

                return msg.channel.send(response)
            }
        }
    }
}

// NOTE: new Map([[k, v], [k, v]])
const goblin = new Enemy({ name: 'goblin', health: 10, attack: 2, description: "Its just a goblin"})

module.exports.enemyList = {
    goblin: goblin
}