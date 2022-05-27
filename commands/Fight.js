"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const config = require('../config.json');
const mysql = require('mysql');
const con = mysql.createConnection({
    host: config.sql.host,
    port: config.sql.port,
    user: config.sql.user,
    password: config.sql.password,
    database: config.sql.database
});
const { locationList } = require('./utils/Location');
module.exports = {
    name: 'fight',
    description: 'Fight something, if there is something to fight.',
    aliases: ['f'],
    usage: '',
    execute: (msg, args) => {
        const id = msg.author.id;
        con.query('SELECT * FROM users WHERE id = ?;', [id], (err, res) => {
            if (err) {
                fs.writeFileSync('./logs/ERR.log', `\n\n${err}`, { flags: "a" });
                console.error('Error selecting from users\n', err);
                return msg.reply('An error occured');
            }
            if (!res || res?.length === 0)
                return msg.reply(`Unknown user, have you used ${config.prefix}start yet?`);
            // Do we have the energy to fight?
            if (res[0].currentHealth <= 5)
                return msg.reply('You lack the energy to do much of anything at the moment, rest a bit and try again later');
            // Uses the same logic as '-location -fight'
            const location = locationList[res[0].location.replace(/\s/, '-')];
            if (location.enemyList?.length > 0) {
                return location.enemyList[Math.floor(location.enemyList.length * Math.random())].beginBattle(msg);
            }
            else {
                return msg.reply('There is nothing to fight here.');
            }
        });
    }
};
