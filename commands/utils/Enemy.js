"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Discord = require("discord.js");
const fs = require('fs');
const _ = require('lodash');
const { itemList } = require('./Item');
const config = require('../../config.json');
const mysql = require('mysql');
const con = mysql.createConnection({
    host: config.sql.host,
    port: config.sql.port,
    user: config.sql.user,
    password: config.sql.password,
    database: config.sql.database
});
// Key is user id
let currentBattles = new Map();
class Enemy {
    constructor(props) {
        this.props = props;
        this.name = props.name;
        this.health = props.health;
        this.attack = props.attack;
        this.description = props.description;
        this.drops = props.drops;
        this.beginRound = this.beginRound;
    }
    /**
     * Start a battle(-fight command)
     */
    beginBattle(msg) {
        const id = msg.author.id;
        // If we are already in a battle then continue it
        if (currentBattles.has(parseInt(id)))
            return this.beginRound(msg);
        // Get user info if they aren't currently in a battle
        con.query('SELECT * FROM users WHERE id = ?;', [id], (err, data) => {
            if (err) {
                fs.writeFileSync('./logs/ERR.log', `\n\n${err}`, { flags: "a" });
                console.error('Error selecting from users\n', err);
                return msg.reply('An error occured');
            }
            // Set battle data to be used in beginRound
            if (data?.length > 0) {
                currentBattles.set(parseInt(id), [{ health: data[0].currentHealth, attack: data[0].attack }, _.cloneDeep(this)]);
                // Take the first turn of the battle
                this.beginRound(msg);
            }
            else {
                return msg.reply(`Could not locate ${msg.author.username} in database, have you used ${config.prefix}start yet?`);
            }
        });
    }
    /**
     * Take a full turn during a fight
     */
    beginRound(msg) {
        const id = msg.author.id;
        if (currentBattles.has(parseInt(id))) {
            const battle = currentBattles.get(parseInt(id));
            const player = battle[0];
            const enemy = battle[1];
            player.health -= enemy.attack;
            enemy.health -= player.attack;
            const response = new Discord.MessageEmbed({
                color: config.colors.red,
                fields: [{
                        name: 'Battle Info',
                        value: "```diff\n" +
                            `- ${msg.author.username} took ${enemy.attack} damage\n` +
                            `- ${enemy.name} took ${player.attack} damage\n\n` +
                            `+ ${msg.author.username} has ${player.health} health left\n` +
                            `+ ${enemy.name} has ${enemy.health} health left\n` +
                            "```"
                    }]
            });
            if (player.health <= 0 || enemy.health <= 0) {
                // End battle
                let dropData = [];
                response.addField("Battle End", `${player.health <= 0
                    ? `The ${enemy.name} has won, you crawl away, defeated, but will live to fight another day.`
                    : `The ${enemy.name} lays dead at your feet.\n${(function () {
                        let data = '';
                        let entries = currentBattles.get(parseInt(id))[1].drops?.entries();
                        if (entries) {
                            for (let i = 0; i < currentBattles.get(parseInt(id))[1].drops.size; i++) {
                                const entry = entries.next().value;
                                // The number of a certain item dropped is either defined as a single number or a range in the form { min: #, max: # }
                                let droppedItemCount = entry[1];
                                if (typeof droppedItemCount === 'object') {
                                    // https://stackoverflow.com/questions/1527803/generating-random-whole-numbers-in-javascript-in-a-specific-range/1527820#1527820
                                    // We know min and max to be whole numbers, but rounding them just in case
                                    const min = Math.ceil(droppedItemCount.min);
                                    const max = Math.floor(droppedItemCount.max);
                                    // Range math
                                    droppedItemCount = Math.floor(Math.random() * (max - min + 1)) + min;
                                }
                                data += `${droppedItemCount} **${entry[0]}**\n`;
                                dropData.push(`${droppedItemCount} ${entry[0]}`);
                            }
                            return data;
                        }
                        return ' ';
                    }())}`}`);
                // Go through each item that was dropped at add it to the database, update quantity if needed
                // %G is a placeholder for if we need to also update gold count somewhere in the for-each loop
                let userTableQuery = `UPDATE users SET currentHealth = ${player.health <= 0 ? 1 : player.health}%G WHERE id = ${id};`;
                dropData.forEach(droppedItem => {
                    droppedItem = droppedItem.trim();
                    // Yay for repeated use of the same variable name for constants
                    const droppedItemData = droppedItem.split(' ');
                    const droppedItemCount = droppedItemData.shift();
                    let droppedItemName = droppedItemData.join(' ');
                    if (droppedItemName.toUpperCase() === 'GOLD') {
                        userTableQuery = userTableQuery.replace('%G', `, gold = gold + ${droppedItemCount}`);
                    }
                    else {
                        // A poor mans version of an UPSERT statement
                        // We MUST use string interpolation here for droppedItemName, I'm not sure why
                        con.query(`SELECT * FROM inventory WHERE id = ? AND name = "${droppedItemName}";`, [id], (err, results) => {
                            if (err) {
                                fs.writeFileSync('./logs/ERR.log', `\n\n${err}`, { flags: "a" });
                                console.error('Error occured adding items to inventory after a combat(SELECT statement)\n', err);
                                return msg.reply('An error occured');
                            }
                            // FIXME: This doesn't TRULY take into account the drop of multiple of the same item which could be a case in the future
                            // We have no logic currently(nor items for that matter) that drops more than 1 of an item, minus gold but thats dealt with elsewhere
                            const q = results?.length > 0
                                ? `UPDATE inventory SET quantity = quantity + ${droppedItemCount} WHERE id = ${id} AND name = "${droppedItemName}";`
                                : `INSERT INTO inventory (id, name, quantity) VALUES (${id}, "${droppedItemName}", ${droppedItemCount});`;
                            con.query(q, (err) => {
                                if (err) {
                                    fs.writeFileSync('./logs/ERR.log', `\n\n${err}`, { flags: "a" });
                                    console.error('Error occured adding items to inventory after a combat(UPSERT statement)\n', err);
                                    return msg.reply('An error occured');
                                }
                            });
                        });
                    }
                });
                if (userTableQuery.includes('%G'))
                    userTableQuery = userTableQuery.replace('%G', '');
                con.query(userTableQuery, [player.health <= 0 ? 1 : player.health, id], (err) => {
                    if (err) {
                        fs.writeFileSync('./logs/ERR.log', `\n\n${err}`, { flags: "a" });
                        console.error('Error updating users\n', err);
                        return msg.reply('An error occured');
                    }
                });
                currentBattles.delete(parseInt(id));
                return msg.channel.send({ embeds: [response] });
            }
            else {
                // Make sure the battle info updates
                currentBattles.set(parseInt(id), [{ health: player.health, attack: player.attack }, enemy]);
                return msg.channel.send({ embeds: [response] });
            }
        }
    }
}
// NOTE: new Map([[k, v], [k, v]])
// @ts-ignore
const goblin = new Enemy({ name: 'goblin', health: 10, attack: 2, description: "Its just a goblin", drops: new Map([['gold', { min: 1, max: 5 }], [itemList['basic_sword'].name, 1]]) });
// const wolf = new Enemy({ name: 'wolf', health: 15, attack: 3, description: 'Not a very good boy', drops: new Map([['gold', 1]])})
module.exports.enemyList = {
    goblin: goblin //, wolf: wolf
};
