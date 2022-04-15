"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
class Item {
    constructor(props) {
        this.name = props.name;
        this.description = props.description;
        this.attack = props.attack || 0;
        this.value = props.value;
    }
    info(msg) {
        msg.channel.send(`> ${this.name}\n> ${this.description}`);
    }
    equip(msg) {
        const id = parseInt(msg.author.id);
        con.query('UPDATE users SET equippedItem = ? WHERE id = ?;', [this.name, id], (err) => {
            if (err) {
                fs.writeFileSync('../../logs/ERR.log', `\n\n${err}`, { flags: "a" });
                console.error('Error updating users\n', err);
                return msg.reply('An error occured');
            }
            return msg.channel.send(`${msg.author.username} equipped ${this.name}`);
        });
    }
}
const stick = new Item({ name: 'stick', description: 'A pointy stick, perhaps not a great weapon but its a start.', attack: 2 });
const basic_sword = new Item({ name: 'Basic Sword', description: 'A little flimsy, but sharp enough to get the job done.', attack: 3 });
module.exports.itemList = {
    stick: stick, basic_sword: basic_sword
};
