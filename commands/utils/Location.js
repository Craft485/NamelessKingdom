"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { enemyList } = require('./Enemy');
class Location {
    constructor(props) {
        this.name = props.name;
        this.enemyList = props.enemyList;
        this.isCity = props.isCity || null;
        this.neighbors = {
            _NORTH: props.neighbors[0],
            _EAST: props.neighbors[1],
            _SOUTH: props.neighbors[2],
            _WEST: props.neighbors[3]
        };
    }
    /**
     * List info on current location(shouldn't need sql)
     */
    info(msg) {
    }
    /**
     * Travel to a neighboring location(sql needed)
     */
    travel(msg) {
    }
}
const knossos = new Location({ name: 'Knossos', description: 'placeholder', neighbors: [], enemyList: [enemyList.goblin] });
module.exports.locationList = {
    Knossos: knossos
};
