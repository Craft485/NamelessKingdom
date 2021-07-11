"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const { itemList } = require('./utils/Item');
const config = require('../config.json');
const mysql = require('mysql');
const con = mysql.createConnection({
    host: config.sql.host,
    port: config.sql.port,
    user: config.sql.user,
    password: config.sql.password,
    database: config.sql.database
});
module.exports = {
    name: 'start',
    description: 'Begin your adventure',
    aliases: ['s'],
    usage: '',
    execute: (msg, args) => {
        // Check DB for user preexisting, return if they're already in there
        const id = msg.author.id;
        con.query('SELECT * FROM users WHERE id = ?;', [id], (err, data) => {
            if (err) {
                fs.writeFileSync('../logs/ERR.log', `\n\n${err}`, { flags: "a" });
                console.error('Error selecting from users\n', err);
                return msg.reply('an error occured');
            }
            // User is new, add to db
            if (!data || !data.length) {
                con.query('INSERT INTO users (id, name, attack, equippedItem) VALUES(?, ?, ?, \'stick\')', [id, msg.author.username, itemList.stick.attack], (err) => {
                    if (err) {
                        fs.writeFileSync('../logs/ERR.log', `\n\n${err}`, { flags: "a" });
                        console.error('Error adding new user\n', err);
                        return msg.reply('an error occured');
                    }
                    return msg.reply(`welcome to Nameless Kingdom, a text based rpg. You can use ${config.prefix}help to view a list of available commands, good luck!`);
                });
            }
            else {
                return msg.reply('you\'ve already begun your adventure');
            }
        });
    }
};
