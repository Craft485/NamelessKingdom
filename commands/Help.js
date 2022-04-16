"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config = require('../config.json');
module.exports = {
    name: 'help',
    description: 'Shows a list of available commands',
    aliases: ['h'],
    usage: '[command name]',
    execute: (msg, args) => {
        // @ts-ignore: property 'commands' doesn't exist on type Client
        const { commands } = msg.client;
        let data = [];
        // Show the full list
        if (!args.length) {
            const commandList = commands.map(command => `${command.name} | ${command.description}`);
            commandList.forEach(commandInfo => { data.push(commandInfo); });
            const response = new discord_js_1.MessageEmbed({
                color: config.colors.green,
                title: 'Here\'s a list of my available commands',
                fields: [{ name: '=====', value: data.join('\n') }],
                footer: { text: `Use ${config.prefix}help [command name] for more information on a specific command` }
            });
            return msg.channel.send({ embeds: [response] });
        }
        // Show info on a specific command
        const name = args[0].toLowerCase();
        const command = commands.get(name) || commands.find(cmd => cmd.aliases && cmd.aliases.includes(name));
        if (!command)
            return msg.reply(`${name} is an invalid command name, see ${config.prefix}help for a list of all possible commands`);
        data.push(`**Name:** ${command.name}`);
        if (command.aliases)
            data.push(`**Aliases:** ${command.aliases.join(', ')}`);
        if (command.description)
            data.push(`**Description:** ${command.description}`);
        if (command.usage)
            data.push(`**Usage:** ${config.prefix}${command.name} ${command.usage}`);
        const response = new discord_js_1.MessageEmbed({
            color: config.colors.green,
            fields: [{ name: '=====', value: data.join('\n') }]
        });
        return msg.channel.send({ embeds: [response] });
    }
};
