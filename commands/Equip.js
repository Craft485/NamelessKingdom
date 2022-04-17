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
    name: 'equip',
    description: 'Take one item out of your hand and put another in, fairly straightforward.',
    aliases: ['e'],
    usage: '{item name}',
    execute: (msg, args) => {
        const id = msg.author.id;
        // Capitalize the item name, needs a good few method calls to get from array to capitalized string
        const itemToEquip = args.join(' ').toLowerCase().split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');
        const validItem = Object.values(itemList).find((item) => item.name.toUpperCase() === itemToEquip.toUpperCase());
        if (validItem) {
            con.query('SELECT * FROM inventory WHERE id = ? AND name = ?;', [id, itemToEquip], (err, res) => {
                if (err) {
                    fs.writeFileSync('./logs/ERR.log', `\n\n${err}`, { flags: "a" });
                    console.error('Error selecting from users(Equip SELECT)\n', err);
                    return msg.reply('An error occured');
                }
                else if (res?.length > 0 && validItem?.attack) {
                    if (!validItem?.attack)
                        return msg.reply('How are you going to kill anything with __THAT__?');
                    con.query('UPDATE users SET equippedItem = ?, attack = ? WHERE id = ?;', [itemToEquip, validItem.attack, id], (err) => {
                        if (err) {
                            fs.writeFileSync('./logs/ERR.log', `\n\n${err}`, { flags: "a" });
                            console.error('Error updating from users(Equip UPDATE)\n', err);
                            return msg.reply('An error occured');
                        }
                        return msg.reply(`You equipped \`${itemToEquip}\`, careful with that thing!`);
                    });
                }
                else {
                    return msg.reply(`Unknown user, have you used ${config.prefix}start yet?`);
                }
            });
        }
        else {
            return msg.reply('Invalid item name given');
        }
    }
};
