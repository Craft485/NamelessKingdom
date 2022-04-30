"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Discord = require("discord.js");
const fs = require('fs');
const _ = require('lodash');
const config = require('../../config.json');
const mysql = require('mysql');
const con = mysql.createConnection({
    host: config.sql.host,
    port: config.sql.port,
    user: config.sql.user,
    password: config.sql.password,
    database: config.sql.database
});
let varients;
fs.readFile('./enemy.varients.json', { encoding: 'utf-8' }, (err, data) => {
    if (err)
        throw err;
    varients = JSON.parse(data);
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
        // Get user info to send to this#beginRound()
        con.query('SELECT * FROM users WHERE id = ?;', [id], (err, data) => {
            if (err) {
                fs.writeFileSync('./logs/ERR.log', `\n\n${err}`, { flags: "a" });
                console.error('Error selecting from users\n', err);
                return msg.reply('An error occured');
            }
            // Set battle data to be used in beginRound
            // If we are already in a battle then continue it
            if (currentBattles.has(parseInt(id)))
                return this.beginRound(msg, data[0]);
            if (data?.length > 0) {
                const varient = varients[Math.floor(Math.random() * varients.length)];
                currentBattles.set(parseInt(id), [{ health: data[0].currentHealth, attack: JSON.parse(data[0].attack) }, _.cloneDeep(this), { roundNumber: 0, varient: varient }]);
                // Take the first turn of the battle
                this.beginRound(msg, data[0]);
            }
            else {
                return msg.reply(`Could not locate ${msg.author.username} in database, have you used ${config.prefix}start yet?`);
            }
        });
    }
    /**
     * Take a full turn during a fight
     */
    beginRound(msg, currentUserData) {
        const id = msg.author.id;
        if (currentBattles.has(parseInt(id))) {
            // battle[0] holds player data, battle[1] holds enemy data, battle[2] holds general data for the combat
            const battle = currentBattles.get(parseInt(id));
            const varient = battle[2].varient;
            const player = battle[0];
            const enemy = battle[1];
            const previousRoundMessage = battle[2].roundNumber > 0 ? battle[2].msg : null;
            battle[2].roundNumber++;
            const damageDealtToPlayer = Math.floor(Math.random() * (enemy.attack[1] - enemy.attack[0] + 1)) + enemy.attack[0];
            const damageDealtToEnemy = Math.floor(Math.random() * (player.attack[1] - player.attack[0] + 1)) + player.attack[0];
            player.health -= damageDealtToPlayer;
            enemy.health -= damageDealtToEnemy;
            const response = new Discord.MessageEmbed({
                color: config.colors.red,
                fields: [{
                        name: `${currentUserData.location} | ${msg.author.username} V.S. ${enemy.name} | Round ${battle[2].roundNumber}`,
                        value: "```diff\n" +
                            `- ${msg.author.username} took ${damageDealtToPlayer} damage\n` +
                            `- ${enemy.name} took ${damageDealtToEnemy} damage\n\n` +
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
                        let entries = currentBattles.get(parseInt(id))[1].drops;
                        if (entries) {
                            entries.forEach((entry) => {
                                // The number of a certain item dropped is either defined as a single number or a range in the form { min?: #, max?: #, chance?: # }
                                let droppedItemCount = entry[1];
                                if (typeof droppedItemCount === 'object') {
                                    // https://stackoverflow.com/questions/1527803/generating-random-whole-numbers-in-javascript-in-a-specific-range/1527820#1527820
                                    // We know min and max to be whole numbers, chance is a float
                                    // typeof droppedItemCount.min === 'number' ? droppedItemCount.min : droppedItemCount.chance
                                    const min = droppedItemCount.min || null;
                                    // typeof droppedItemCount.max === 'number' ? droppedItemCount.max : droppedItemCount.chance
                                    const max = droppedItemCount.max || null;
                                    // Drop chance/range logic
                                    const chance = droppedItemCount.chance || null;
                                    chance ? droppedItemCount = (Math.random() <= chance ? 1 : 0) : droppedItemCount = Math.floor(Math.random() * (max - min + 1)) + min;
                                }
                                if (droppedItemCount > 0) {
                                    data += `${droppedItemCount} **${entry[0]}**\n`;
                                    dropData.push(`${droppedItemCount} ${entry[0]}`);
                                }
                            });
                            return data;
                        }
                        return ' ';
                    }())}`}`);
                // Go through each item that was dropped at add it to the database, update quantity if needed
                // %G is a placeholder for if we need to also update gold count somewhere in the for-each loop
                let userTableQuery = `UPDATE users SET currentHealth = ${player.health <= 0 ? 1 : player.health}%G%E WHERE id = ${id};`;
                dropData.forEach(droppedItem => {
                    droppedItem = droppedItem.trim();
                    // Yay for repeated use of the same variable name for constants
                    const droppedItemData = droppedItem.split(' ');
                    const droppedItemCount = droppedItemData.shift();
                    let droppedItemName = droppedItemData.join(' ');
                    if (droppedItemName.toUpperCase() === 'GOLD') {
                        userTableQuery = userTableQuery.replace('%G', `, gold = gold + ${droppedItemCount}`);
                    }
                    else if (droppedItemName.toLowerCase() === 'experience') {
                        // Add experience to userTableQuery, calculate level,  update user level
                        const level = Math.floor(Math.sqrt(Math.floor(parseInt(currentUserData.exp) + parseInt(droppedItemCount))) / 10.5);
                        userTableQuery = userTableQuery.replace('%E', `, exp = exp + ${droppedItemCount}, level = ${level}`);
                        if (level > parseInt(currentUserData.level))
                            response.addField('--------------------------', "```asciidoc\n" + `=== Level Up! ===\n[ Reached Level ${level} ]\n` + "```");
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
                if (userTableQuery.includes('%E'))
                    userTableQuery = userTableQuery.replace('%E', '');
                con.query(userTableQuery, [player.health <= 0 ? 1 : player.health, id], (err) => {
                    if (err) {
                        fs.writeFileSync('./logs/ERR.log', `\n\n${err}`, { flags: "a" });
                        console.error('Error updating users\n', err);
                        return msg.reply('An error occured');
                    }
                });
                currentBattles.delete(parseInt(id));
                previousRoundMessage ? previousRoundMessage.edit({ embeds: [response] }) : msg.channel.send({ embeds: [response] });
                msg.delete();
                return;
            }
            else {
                // Make sure the battle info updates
                // I'm aware this is a complete mess all to acheive a very simple concept
                // Literally the only difference is if we call Message#send() or Message#edit()
                previousRoundMessage
                    ? previousRoundMessage.edit({ embeds: [response] }).then(message => {
                        currentBattles.set(parseInt(id), [
                            { health: player.health, attack: player.attack },
                            enemy,
                            { roundNumber: battle[2].roundNumber, msg: message }
                        ]);
                    })
                    : msg.channel.send({ embeds: [response] }).then(message => {
                        currentBattles.set(parseInt(id), [
                            { health: player.health, attack: player.attack },
                            enemy,
                            { roundNumber: battle[2].roundNumber, msg: message }
                        ]);
                    });
                // Prevent clogging up channel
                msg.delete();
                return;
            }
        }
    }
}
// Load enemies from JSON file
const enemyList = {};
const enemyJSONList = require('../../enemies.json');
Object.keys(enemyJSONList).forEach((key) => {
    const enemyTemplate = enemyJSONList[key];
    enemyList[key] = new Enemy({ name: key, health: enemyTemplate.health, attack: enemyTemplate.attack, description: enemyTemplate.description, drops: enemyTemplate.drops });
});
module.exports.enemyList = enemyList;
