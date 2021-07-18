const fs = require('fs')
const config = require('../config.json')
const mysql = require('mysql')
const con = mysql.createConnection({
    host: config.sql.host,
    port: config.sql.port,
    user: config.sql.user,
    password: config.sql.password,
    database: config.sql.database
})

/**
 * Update health values
 */
function interval() {
    con.query(' UPDATE users SET currentHealth = IF(currentHealth + 5 >= maxHealth, maxHealth, currentHealth + 5) WHERE currentHealth > 0;', (err) => {
        if (err) {
            fs.writeFileSync('./logs/ERR.log', `\n\n${err}`, { flag: 'a' })
            console.error('Error updating users on interval')
        }

        console.log('Users table has been updated')
    })
}

module.exports.interval = interval