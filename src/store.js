'use strict';

var Immutable = require('immutable');

function Store() {
  this.historyIndex = 0;
  this.history = [Immutable.List([])];
  this.annotations = [Immutable.List([])];
}

Store.prototype = {

  operation(fn, annotation) {
    // Wrap an operation: Given a function, apply it the history list.
    // via http://www.macwright.org/2015/05/18/practical-undo.html
    this.annotations = this.annotations.slice(0, this.historyIndex + 1);
    this.history = this.history.slice(0, this.historyIndex + 1);
    var newVersion = fn(this.history[this.historyIndex]);
    this.history.push(newVersion);
    this.annotations.push(annotation);
    this.historyIndex++;
  },

  getAll() {
    return {
      type: 'FeatureCollection',
      features: this.history[this.historyIndex].toJS()
    };
  },

  clear() {
    this.historyIndex = 0;
    this.history = [Immutable.List([])];
  },

  get(id) {
    var current = this.history[this.historyIndex];
    return current.filter((feature) => {
      return feature.get('properties').id === id;
    });
  },

  unset(type, id) {
   this.operation((data) => {
    return data.filter((feature) => {
        return feature.get('properties').id !== id;
      });
    }, 'Removed a ' + type);
  },

  _findIndex(id) {
    var index;
    this.history[this.historyIndex].forEach((feature, i) => {
      if (feature.get('properties').id === id) index = i;
    });
    return index;
  },

  set(type, id, coords) {
    this.operation((data) => {
      var feature = Immutable.Map({
        type: 'Feature',
        properties: {
          id: id
        },
        geometry: {
          type: type,
          coordinates: coords
        }
      });

      // Does an index for this exist?
      var updateIndex = this._findIndex(id);

      return (updateIndex >= 0) ?
        data.set(updateIndex, feature) :
        data.push(feature);

    }, 'Added a ' + type);
  },

  redo() {
    if (this.historyIndex < this.history.length) this.historyIndex++;
  },

  undo() {
    if (this.historyIndex > 0) this.historyIndex--;
  }
};

module.exports = Store;
