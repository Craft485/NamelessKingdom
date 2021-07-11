import * as Discord from 'discord.js'
const { enemyList } = require('./Enemy')

interface localeProps {
    name: string,
    enemyList: Array<any>,
    description: string,
    neighbors: Array<Location>
    isCity?: boolean
}

class Location {
    name: string
    enemyList: Array<any>
    isCity: boolean
    neighbors: Object
    constructor(props: localeProps) {
        this.name = props.name
        this.enemyList = props.enemyList
        this.isCity = props.isCity || null
        this.neighbors = {
            _NORTH: props.neighbors[0],
            _EAST: props.neighbors[1],
            _SOUTH: props.neighbors[2],
            _WEST: props.neighbors[3]
        }
    }
    
    /**
     * List info on current location(shouldn't need sql)
     */
    info (msg: Discord.Message) {

    }

    /**
     * Travel to a neighboring location(sql needed)
     */
    travel (msg: Discord.Message) {

    }
}

const knossos = new Location({ name: 'Knossos', description: 'placeholder', neighbors: [], enemyList: [enemyList.goblin] })

module.exports.locationList = {
    Knossos: knossos
}