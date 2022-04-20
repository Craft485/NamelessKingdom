"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Discord = require("discord.js");
const { enemyList } = require('./Enemy');
const fs = require('fs');
const config = require('../../config.json');
const mysql = require('mysql');
const con = mysql.createConnection({
    host: config.sql.host,
    port: config.sql.port,
    user: config.sql.user,
    password: config.sql.password,
    database: config.sql.database
});
class Location {
    constructor(props) {
        this.name = props.name;
        this.enemyList = props.enemyList;
        this.isCity = props.isCity || null;
        this.neighbors = {
            North: props.neighbors[0] || null,
            East: props.neighbors[1] || null,
            South: props.neighbors[2] || null,
            West: props.neighbors[3] || null
        };
        this.description = props.description;
    }
    /**
     * List info on current location
     */
    info(msg) {
        let data = '';
        for (const [direction, location] of Object.entries(this.neighbors))
            if (location)
                data += `\t#Travel [${direction}] to arrive at [${location}].\n`;
        // TODO: Add more information about the location here, perhaps the kinds of enemies to be found and the shops around
        const response = new Discord.MessageEmbed({
            color: config.colors.green,
            fields: [{
                    name: this.name,
                    value: '```css\n' +
                        '{}@Neighboring-Locations{}\n' +
                        data +
                        '```'
                }],
            footer: { text: this.description }
        });
        return msg.channel.send({ embeds: [response] });
    }
    /**
     * Travel to a neighboring location
     */
    travel(msg, args) {
        const id = msg.author.id;
        // Check for user existing
        con.query('SELECT * FROM users WHERE id = ?;', [id], (err, userData) => {
            if (err) {
                fs.writeFileSync('./logs/ERR.log', `\n\n${err}`, { flags: "a" });
                console.error('Error selecting from users\n', err);
                return msg.reply('An error occured');
            }
            if (userData?.length > 0) {
                const destination = args[1] || args[0];
                // Is the destination valid?
                const a = Object.values(this.neighbors).find(d => d?.toLowerCase() === destination?.toLowerCase());
                const b = Object.keys(this.neighbors).find(d => d?.toLowerCase() === destination?.toLowerCase());
                // Tile casing, ensure that the first letter is capital and the rest are lower case
                const tileCased = destination?.charAt(0)?.toUpperCase() + destination?.substr(1)?.toLowerCase();
                const finalDestination = a ? tileCased : b ? this.neighbors[tileCased] : null;
                if (finalDestination) {
                    con.query('UPDATE users SET location = ? WHERE id = ?;', [finalDestination, id], (err) => {
                        if (err) {
                            fs.writeFileSync('./logs/ERR.log', `\n\n${err}`, { flags: "a" });
                            console.error('Error updating users\n', err);
                            return msg.reply('An error occured');
                        }
                        return msg.reply(`You make your way to ${finalDestination} and arrive safely, but dangers still lurk all around you.`);
                    });
                }
                else {
                    return msg.reply('An error occured');
                }
            }
            else {
                return msg.reply(`We couldn't find you in the database. Have you used ${config.prefix}start yet?`);
            }
        });
    }
}
const knossos = new Location({ name: 'Knossos', description: 'placeholder', neighbors: ['Mycenae'], enemyList: [enemyList.goblin] });
const Mycenae = new Location({ name: 'Mycenae', description: 'placeholder', neighbors: [null, null, 'Knossos'], enemyList: [enemyList.goblin] });
module.exports.locationList = {
    Knossos: knossos, Mycenae: Mycenae
};
